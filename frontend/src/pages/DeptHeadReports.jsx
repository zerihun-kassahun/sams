import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchDepartmentSummary } from "../api/reports";
import { DEPT_HEAD_NAV } from "../config/deptHeadNav";

export default function DeptHeadReports() {
  const [report, setReport] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const filters = {};
        if (fromDate) filters.from = fromDate;
        if (toDate) filters.to = toDate;
        const data = await fetchDepartmentSummary(filters);
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [fromDate, toDate]);

  return (
    <DashboardLayout
      title="Department Reports"
      roleLabel="Department Head"
      navItems={DEPT_HEAD_NAV}
    >
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <h2>Department overview</h2>
        <p className="muted">
          Attendance statistics across all sections in your department.
        </p>

        <div className="toolbar toolbar-wrap">
          <div>
            <label htmlFor="dept-from">From</label>
            <input
              id="dept-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="dept-to">To</label>
            <input
              id="dept-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading department report...</p>
      ) : report ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Department</h3>
              <p>{report.department.name}</p>
            </div>
            <div className="stat-card">
              <h3>Sections</h3>
              <p>{report.totals.sections}</p>
            </div>
            <div className="stat-card">
              <h3>Average rate</h3>
              <p>{report.totals.average_attendance_rate}%</p>
            </div>
          </div>

          <div className="panel">
            <h2>Section breakdown</h2>
            {report.sections.length === 0 ? (
              <p className="muted">No sections found in this department.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Students</th>
                      <th>Sessions</th>
                      <th>Present records</th>
                      <th>Average rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sections.map((section) => (
                      <tr key={section.section_id}>
                        <td>
                          {section.section_name}
                          {section.year ? ` · Year ${section.year}` : ""}
                        </td>
                        <td>{section.student_count}</td>
                        <td>{section.session_count}</td>
                        <td>{section.present_records}</td>
                        <td>{section.average_attendance_rate}%</td>
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
