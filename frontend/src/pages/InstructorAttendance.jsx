import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import AttendanceWebcam from "../components/AttendanceWebcam";
import {
  closeAttendanceSession,
  fetchActiveSession,
  recognizeAttendance,
  startAttendanceSession,
} from "../api/attendance";
import { fetchModelStatus } from "../api/face";
import { INSTRUCTOR_NAV } from "../config/instructorNav";

export default function InstructorAttendance() {
  const [modelStatus, setModelStatus] = useState({ trained: false });
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [statusData, sessionData] = await Promise.all([
          fetchModelStatus(),
          fetchActiveSession(),
        ]);
        setModelStatus(statusData);
        setSession(sessionData.session);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleStartSession() {
    if (!modelStatus.trained) {
      setError("Prepare face recognition before starting attendance.");
      return;
    }

    setStarting(true);
    setError("");
    setFeedback(null);
    try {
      const result = await startAttendanceSession(modelStatus.course_id);
      setSession(result.session);
      setFeedback({ type: "success", message: result.message });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function handleRecognize(imageData) {
    if (!session) return;

    setRecognizing(true);
    setError("");
    try {
      const result = await recognizeAttendance(session.id, imageData);

      if (result.recognized) {
        setFeedback({
          type: result.already_marked ? "warning" : "success",
          message: result.message,
          student: result.student,
          confidence: result.confidence_score,
        });

        if (!result.already_marked && result.record) {
          setSession((prev) => ({
            ...prev,
            present_count: (prev.present_count || 0) + 1,
            records: [result.record, ...(prev.records || [])],
          }));
        }
      } else {
        setFeedback({
          type: "error",
          message: result.message || result.error || "Face not recognized.",
        });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setRecognizing(false);
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    if (!window.confirm("Close this attendance session?")) return;

    setClosing(true);
    setError("");
    try {
      const result = await closeAttendanceSession(session.id);
      setSession(result.session);
      setFeedback({ type: "success", message: result.message });
    } catch (err) {
      setError(err.message);
    } finally {
      setClosing(false);
    }
  }

  const sessionActive = session?.status === "active";

  return (
    <DashboardLayout title="Capture Attendance" roleLabel="Instructor" navItems={INSTRUCTOR_NAV}>
      {error && <div className="alert alert-error">{error}</div>}
      {feedback && (
        <div className={`alert alert-${feedback.type === "warning" ? "warning" : feedback.type}`}>
          <p>{feedback.message}</p>
          {feedback.confidence != null && (
            <p className="muted">Confidence: {(feedback.confidence * 100).toFixed(1)}%</p>
          )}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading attendance session...</p>
      ) : !modelStatus.trained ? (
        <div className="panel">
          <h2>Recognition not prepared</h2>
          <p className="muted">
            Load student face encodings for your course before capturing attendance.
          </p>
          <Link className="btn btn-primary btn-inline" to="/instructor/prepare">
            Prepare recognition
          </Link>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Course</h3>
              <p>{modelStatus.course_code}</p>
            </div>
            <div className="stat-card">
              <h3>Section</h3>
              <p>{modelStatus.section_name}</p>
            </div>
            <div className="stat-card">
              <h3>Marked present</h3>
              <p>{session?.present_count ?? 0}</p>
            </div>
          </div>

          <div className="attendance-layout">
            <div className="panel">
              <h2>Session</h2>
              {session ? (
                <div className="info-box">
                  <p>
                    <strong>Status:</strong> {session.status}
                  </p>
                  <p>
                    <strong>Started:</strong> {new Date(session.start_time).toLocaleString()}
                  </p>
                  <p>
                    <strong>Course:</strong> {session.course_code} — {session.course_name}
                  </p>
                </div>
              ) : (
                <p className="muted">No active attendance session.</p>
              )}

              <div className="panel-actions">
                {!sessionActive && (
                  <button
                    className="btn btn-primary btn-inline"
                    type="button"
                    onClick={handleStartSession}
                    disabled={starting}
                  >
                    {starting ? "Starting..." : "Start attendance session"}
                  </button>
                )}
                {sessionActive && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleCloseSession}
                    disabled={closing}
                  >
                    {closing ? "Closing..." : "End session"}
                  </button>
                )}
              </div>

              <h3>Present students</h3>
              {!session?.records?.length ? (
                <p className="muted">No students marked present yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Time</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.records.map((record) => (
                        <tr key={record.id}>
                          <td>{record.student_id}</td>
                          <td>{record.full_name}</td>
                          <td>{new Date(record.recognized_at).toLocaleTimeString()}</td>
                          <td>
                            {record.confidence_score != null
                              ? `${(record.confidence_score * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel">
              {sessionActive ? (
                <AttendanceWebcam
                  onRecognize={handleRecognize}
                  disabled={!sessionActive}
                  recognizing={recognizing}
                />
              ) : (
                <div>
                  <h2>Webcam</h2>
                  <p className="muted">Start an attendance session to enable live face recognition.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
