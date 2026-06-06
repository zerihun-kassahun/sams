import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchInstructorCourses } from "../api/courses";
import { clearPreparedModel, fetchModelStatus, prepareRecognition } from "../api/face";
import { INSTRUCTOR_NAV } from "../config/instructorNav";

export default function InstructorPrepare() {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState({ trained: false });
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [skippedStudents, setSkippedStudents] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [courseData, statusData] = await Promise.all([
          fetchInstructorCourses(),
          fetchModelStatus(),
        ]);
        setCourses(courseData.courses);
        setStatus(statusData);
        if (statusData.trained) {
          setSelectedCourseId(String(statusData.course_id));
        } else if (courseData.courses.length === 1) {
          setSelectedCourseId(String(courseData.courses[0].id));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handlePrepare(event) {
    event.preventDefault();
    if (!selectedCourseId) {
      setError("Select a course to prepare recognition.");
      return;
    }

    setPreparing(true);
    setError("");
    setSuccess("");
    setSkippedStudents([]);
    setWarnings([]);

    try {
      const result = await prepareRecognition(Number(selectedCourseId));
      setStatus(result.status);
      setSkippedStudents(result.skipped_students || []);
      setWarnings(result.warnings || []);
      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparing(false);
    }
  }

  async function handleClear() {
    setError("");
    setSuccess("");
    try {
      await clearPreparedModel();
      setStatus({ trained: false });
      setSkippedStudents([]);
      setWarnings([]);
      setSuccess("Prepared recognition model cleared.");
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId);

  return (
    <DashboardLayout title="Prepare Recognition" roleLabel="Instructor" navItems={INSTRUCTOR_NAV}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Recognition status</h3>
          <p>{status.trained ? "Prepared" : "Not prepared"}</p>
        </div>
        <div className="stat-card">
          <h3>Indexed students</h3>
          <p>{status.trained ? status.student_count : "—"}</p>
        </div>
        <div className="stat-card">
          <h3>Face encodings</h3>
          <p>{status.trained ? status.encoding_count : "—"}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Load student faces for recognition</h2>
        <p className="muted">
          Before class, select your course and load stored facial encodings for students in that
          section. This indexes registered faces so live attendance can recognize students quickly.
        </p>

        {loading ? (
          <p className="muted">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="muted">No courses are assigned to your account yet.</p>
        ) : (
          <form className="prepare-form" onSubmit={handlePrepare}>
            <div className="form-group">
              <label htmlFor="course_id">Course</label>
              <select
                id="course_id"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name}
                    {course.section_name ? ` (${course.section_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedCourse && (
              <div className="info-box">
                <p>
                  <strong>Section:</strong> {selectedCourse.section_name || "—"}
                </p>
                <p>
                  <strong>Department:</strong> {selectedCourse.department_name || "—"}
                </p>
                {selectedCourse.schedule_info && (
                  <p>
                    <strong>Schedule:</strong> {selectedCourse.schedule_info}
                  </p>
                )}
              </div>
            )}

            <div className="panel-actions">
              <button className="btn btn-primary btn-inline" type="submit" disabled={preparing}>
                {preparing ? "Preparing..." : "Prepare recognition"}
              </button>
              {status.trained && (
                <button className="btn btn-secondary" type="button" onClick={handleClear}>
                  Clear prepared model
                </button>
              )}
            </div>
          </form>
        )}

        {status.trained && (
          <div className="info-box">
            <p>
              <strong>Active model:</strong> {status.course_code} — {status.course_name}
            </p>
            <p>
              <strong>Section:</strong> {status.section_name} · <strong>Department:</strong>{" "}
              {status.department_name}
            </p>
            <p>
              <strong>Prepared at:</strong> {new Date(status.prepared_at).toLocaleString()}
            </p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="alert alert-warning">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        {skippedStudents.length > 0 && (
          <div className="panel nested-panel">
            <h3>Skipped students</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {skippedStudents.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.student_id}</td>
                      <td>{student.full_name}</td>
                      <td>{student.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
