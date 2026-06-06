import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchInstructorCourses } from "../api/courses";
import {
  fetchInstructorCourseSummary,
  fetchInstructorReportSessions,
  fetchInstructorSessionReport,
} from "../api/reports";
import { INSTRUCTOR_NAV } from "../config/instructorNav";

export default function InstructorReports() {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [view, setView] = useState("session");
  const [sessionReport, setSessionReport] = useState(null);
  const [summaryReport, setSummaryReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInstructorCourses()
      .then((data) => {
        setCourses(data.courses);
        if (data.courses.length === 1) {
          setCourseId(String(data.courses[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!courseId || view !== "session") {
      setSessions([]);
      setSessionId("");
      return;
    }

    const filters = { course_id: courseId };
    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;

    fetchInstructorReportSessions(filters)
      .then((data) => {
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          setSessionId(String(data.sessions[0].id));
        } else {
          setSessionId("");
          setSessionReport(null);
        }
      })
      .catch((err) => setError(err.message));
  }, [courseId, fromDate, toDate, view]);

  useEffect(() => {
    if (!sessionId || view !== "session") {
      setSessionReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");
    fetchInstructorSessionReport(sessionId)
      .then(setSessionReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingReport(false));
  }, [sessionId, view]);

  useEffect(() => {
    if (view !== "summary" || !courseId) {
      setSummaryReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");
    const filters = { course_id: courseId };
    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;

    fetchInstructorCourseSummary(filters)
      .then(setSummaryReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingReport(false));
  }, [view, courseId, fromDate, toDate]);

  return (
    <DashboardLayout title="Attendance Reports" roleLabel="Instructor" navItems={INSTRUCTOR_NAV}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Report filters</h2>
            <p className="muted">View session attendance or course-wide summary statistics.</p>
          </div>
          <div className="view-toggle">
            <button
              className={`btn btn-sm ${view === "session" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => setView("session")}
            >
              Session report
            </button>
            <button
              className={`btn btn-sm ${view === "summary" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => setView("summary")}
            >
              Course summary
            </button>
          </div>
        </div>

        <div className="toolbar toolbar-wrap">
          <div>
            <label htmlFor="report-course">Course</label>
            <select
              id="report-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={loading || courses.length === 0}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-from">From</label>
            <input
              id="report-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="report-to">To</label>
            <input
              id="report-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {view === "session" && (
            <div>
              <label htmlFor="report-session">Session</label>
              <select
                id="report-session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={!sessions.length}
              >
                <option value="">Select session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} · {session.course_code} ({session.present_count} present)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {view === "session" && (
        <div className="panel">
          <h2>Session attendance</h2>
          {loadingReport ? (
            <p className="muted">Loading session report...</p>
          ) : !sessionReport ? (
            <p className="muted">Select a course and session to view attendance.</p>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Present</h3>
                  <p>{sessionReport.summary.present_count}</p>
                </div>
                <div className="stat-card">
                  <h3>Absent</h3>
                  <p>{sessionReport.summary.absent_count}</p>
                </div>
                <div className="stat-card">
                  <h3>Attendance rate</h3>
                  <p>{sessionReport.summary.attendance_rate}%</p>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Recognized at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionReport.students.map((student) => (
                      <tr key={student.student_db_id}>
                        <td>{student.student_id}</td>
                        <td>{student.full_name}</td>
                        <td>
                          <span
                            className={`badge ${
                              student.status === "present" ? "badge-success" : "badge-muted"
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td>
                          {student.recognized_at
                            ? new Date(student.recognized_at).toLocaleTimeString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {view === "summary" && (
        <div className="panel">
          <h2>Course summary</h2>
          {loadingReport ? (
            <p className="muted">Loading course summary...</p>
          ) : !summaryReport ? (
            <p className="muted">Select a course to view summary statistics.</p>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Sessions</h3>
                  <p>{summaryReport.summary.total_sessions}</p>
                </div>
                <div className="stat-card">
                  <h3>Students</h3>
                  <p>{summaryReport.summary.total_students}</p>
                </div>
                <div className="stat-card">
                  <h3>Average rate</h3>
                  <p>{summaryReport.summary.average_attendance_rate}%</p>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Sessions attended</th>
                      <th>Total sessions</th>
                      <th>Attendance rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryReport.students.map((student) => (
                      <tr key={student.student_db_id}>
                        <td>{student.student_id}</td>
                        <td>{student.full_name}</td>
                        <td>{student.sessions_attended}</td>
                        <td>{student.total_sessions}</td>
                        <td>{student.attendance_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
