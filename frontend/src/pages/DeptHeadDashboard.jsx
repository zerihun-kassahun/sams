import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { fetchDepartmentSummary } from "../api/reports";
import { DEPT_HEAD_NAV } from "../config/deptHeadNav";

export default function DeptHeadDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartmentSummary()
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Department Head Dashboard"
      roleLabel="Department Head"
      navItems={DEPT_HEAD_NAV}
    >
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Sections</h3>
          <p>{loading ? "..." : report?.totals.sections ?? "—"}</p>
        </div>
        <div className="stat-card">
          <h3>Students</h3>
          <p>{loading ? "..." : report?.totals.students ?? "—"}</p>
        </div>
        <div className="stat-card">
          <h3>Attendance rate</h3>
          <p>{loading ? "..." : `${report?.totals.average_attendance_rate ?? 0}%`}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Department overview</h2>
        <p className="muted">
          Monitor attendance across sections in{" "}
          {report?.department?.name || "your department"}.
        </p>
        <div className="panel-actions">
          <Link className="btn btn-primary btn-inline" to="/dept-head/reports">
            Department reports
          </Link>
          <Link className="btn btn-secondary" to="/dept-head/summary">
            Section summary
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
