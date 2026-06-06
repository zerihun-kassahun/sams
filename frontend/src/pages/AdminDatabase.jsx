import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  createDatabaseBackup,
  deleteDatabaseBackup,
  downloadDatabaseBackup,
  fetchDatabaseInfo,
  formatBytes,
} from "../api/admin";
import { ADMIN_NAV } from "../config/adminNav";

export default function AdminDatabase() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDatabaseInfo();
      setInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  async function handleBackup() {
    setBackingUp(true);
    setError("");
    setSuccess("");
    try {
      const result = await createDatabaseBackup();
      setSuccess(result.message);
      await loadInfo();
    } catch (err) {
      setError(err.message);
    } finally {
      setBackingUp(false);
    }
  }

  async function handleDownload(filename) {
    setError("");
    try {
      await downloadDatabaseBackup(filename);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(filename) {
    if (!window.confirm(`Delete backup "${filename}"?`)) return;

    setError("");
    setSuccess("");
    try {
      const result = await deleteDatabaseBackup(filename);
      setSuccess(result.message);
      await loadInfo();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DashboardLayout title="Database Management" roleLabel="Admin" navItems={ADMIN_NAV}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <p className="muted">Loading database information...</p>
      ) : info ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Database size</h3>
              <p>{formatBytes(info.database.size_bytes)}</p>
            </div>
            <div className="stat-card">
              <h3>Students</h3>
              <p>{info.counts.students}</p>
            </div>
            <div className="stat-card">
              <h3>Attendance records</h3>
              <p>{info.counts.attendance_records}</p>
            </div>
            <div className="stat-card">
              <h3>Backups</h3>
              <p>{info.backups.length}</p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Database overview</h2>
                <p className="muted">Monitor system data and create SQLite backups.</p>
              </div>
              <button
                className="btn btn-primary btn-inline"
                type="button"
                onClick={handleBackup}
                disabled={backingUp || !info.database.exists}
              >
                {backingUp ? "Creating backup..." : "Create backup"}
              </button>
            </div>

            <div className="info-box">
              <p>
                <strong>Path:</strong> {info.database.path}
              </p>
              <p>
                <strong>Backup folder:</strong> {info.database.backup_directory}
              </p>
              <p>
                <strong>Status:</strong> {info.database.exists ? "Available" : "Missing"}
              </p>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Users</td>
                    <td>{info.counts.users}</td>
                  </tr>
                  <tr>
                    <td>Students</td>
                    <td>{info.counts.students}</td>
                  </tr>
                  <tr>
                    <td>Face images</td>
                    <td>{info.counts.student_faces}</td>
                  </tr>
                  <tr>
                    <td>Departments</td>
                    <td>{info.counts.departments}</td>
                  </tr>
                  <tr>
                    <td>Sections</td>
                    <td>{info.counts.sections}</td>
                  </tr>
                  <tr>
                    <td>Courses</td>
                    <td>{info.counts.courses}</td>
                  </tr>
                  <tr>
                    <td>Attendance sessions</td>
                    <td>{info.counts.attendance_sessions}</td>
                  </tr>
                  <tr>
                    <td>Attendance records</td>
                    <td>{info.counts.attendance_records}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Backup history</h2>
            {info.backups.length === 0 ? (
              <p className="muted">No backups created yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.backups.map((backup) => (
                      <tr key={backup.filename}>
                        <td>{backup.filename}</td>
                        <td>{formatBytes(backup.size_bytes)}</td>
                        <td>{new Date(backup.created_at).toLocaleString()}</td>
                        <td className="actions-cell">
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            onClick={() => handleDownload(backup.filename)}
                          >
                            Download
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => handleDelete(backup.filename)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
