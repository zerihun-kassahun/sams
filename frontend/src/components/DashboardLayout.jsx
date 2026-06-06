import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({ title, roleLabel, navItems, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>SAMS</h2>
        <p className="sidebar-tagline">Smart Attendance</p>
        <span className="role-badge">{roleLabel}</span>
        <nav>
          {navItems.map((item) => {
            const isActive = item.path ? location.pathname === item.path : item.active;
            if (item.disabled) {
              return (
                <span key={item.label} className="nav-link nav-link-disabled">
                  {item.label}
                </span>
              );
            }
            if (item.path) {
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <span key={item.label} className={`nav-link ${isActive ? "active" : ""}`}>
                {item.label}
              </span>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="muted">Welcome, {user?.full_name}</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
