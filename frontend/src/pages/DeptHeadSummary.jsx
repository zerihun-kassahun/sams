import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchDepartmentSectionReport, fetchDepartmentSections } from "../api/reports";
import { DEPT_HEAD_NAV } from "../config/deptHeadNav";

export default function DeptHeadSummary() {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDepartmentSections()
      .then((data) => {
        setSections(data.sections);
        if (data.sections.length === 1) {
          setSectionId(String(data.sections[0].id));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setReport(null);
      return;
    }

    async function load() {
      setLoadingReport(true);
      setError("");
      try {
        const filters = {};
        if (fromDate) filters.from = fromDate;
        if (toDate) filters.to = toDate;
        const data = await fetchDepartmentSectionReport(sectionId, filters);
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingReport(false);
      }
    }

    load();
  }, [sectionId, fromDate, toDate]);

  return (
    <DashboardLayout title="Section Summary" roleLabel="Department Head" navItems={DEPT_HEAD_NAV}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <h2>Section summary report</h2>
        <p className="muted">Student attendance rates and session history for a section.</p>

        <div className="toolbar toolbar-wrap">
          <div>
            <label htmlFor="summary-section">Section</label>
            <select
              id="summary-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={loading || sections.length === 0}
            >
              <option value="">Select section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                  {section.year ? ` · Year ${section.year}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="summary-from">From</label>
            <input
              id="summary-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="summary-to">To</label>
            <input
              id="summary-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loadingReport ? (
        <p className="muted">Loading section summary...</p>
      ) : !report ? (
        <p className="muted">Select a section to view the summary report.</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Section</h3>
              <p>{report.section.name}</p>
            </div>
            <div className="stat-card">
              <h3>Sessions</h3>
              <p>{report.summary.total_sessions}</p>
            </div>
            <div className="stat-card">
              <h3>Average rate</h3>
              <p>{report.summary.average_attendance_rate}%</p>
            </div>
          </div>

          <div className="panel">
            <h2>Student attendance</h2>
            {report.students.length === 0 ? (
              <p className="muted">No students in this section.</p>
            ) : (
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
                    {report.students.map((student) => (
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
            )}
          </div>

          <div className="panel">
            <h2>Recent sessions</h2>
            {report.sessions.length === 0 ? (
              <p className="muted">No closed attendance sessions in this period.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.session_date}</td>
                        <td>
                          {session.course_code} — {session.course_name}
                        </td>
                        <td>{session.present_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
