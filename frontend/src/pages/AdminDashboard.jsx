import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { fetchUserStats } from "../api/users";
import { ADMIN_NAV } from "../config/adminNav";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: "—",
    instructors: "—",
    department_heads: "—",
    sections: "—",
  });

  useEffect(() => {
    fetchUserStats()
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard" roleLabel="Admin" navItems={ADMIN_NAV}>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Students</h3>
          <p>{stats.students}</p>
        </div>
        <div className="stat-card">
          <h3>Instructors</h3>
          <p>{stats.instructors}</p>
        </div>
        <div className="stat-card">
          <h3>Dept heads</h3>
          <p>{stats.department_heads}</p>
        </div>
        <div className="stat-card">
          <h3>Sections</h3>
          <p>{stats.sections}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Quick actions</h2>
        <p className="muted">
          Manage users, register students with face capture, and back up the system database.
        </p>
        <div className="panel-actions">
          <Link className="btn btn-primary btn-inline" to="/admin/users">
            Manage users
          </Link>
          <Link className="btn btn-secondary" to="/admin/students">
            Register students
          </Link>
          <Link className="btn btn-secondary" to="/admin/database">
            Database backup
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
