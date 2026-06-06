import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  admin: "/admin",
  instructor: "/instructor",
  department_head: "/dept-head",
};

const FEATURES = [
  {
    title: "Face recognition",
    description:
      "Students are identified contactlessly via webcam. No cards, no manual roll calls, no proxy attendance.",
    icon: "◎",
  },
  {
    title: "Real-time capture",
    description:
      "Instructors start a session, students present their faces, and attendance is recorded in seconds.",
    icon: "◉",
  },
  {
    title: "Smart reports",
    description:
      "Session, course, and department summaries with attendance rates — ready when you need them.",
    icon: "▣",
  },
  {
    title: "Secure & organized",
    description:
      "Role-based access, biometric consent, and database backups keep institutional data protected.",
    icon: "◈",
  },
];

const STEPS = [
  { step: "01", title: "Register students", text: "Admin enrolls students, assigns sections, and captures face images." },
  { step: "02", title: "Prepare recognition", text: "Instructor loads facial encodings for the course before class." },
  { step: "03", title: "Capture attendance", text: "Live webcam recognition marks students present automatically." },
  { step: "04", title: "Review reports", text: "Instructors and department heads monitor attendance trends." },
];

const ROLES = [
  { role: "Administrator", detail: "Users, students, face data, database backup" },
  { role: "Instructor", detail: "Prepare recognition, live sessions, course reports" },
  { role: "Department Head", detail: "Department-wide and section attendance insights" },
  { role: "Student", detail: "Presents face at camera — no login required" },
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (user) {
    return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;
  }

  return (
    <div className="landing">
      <div className="landing-glow landing-glow-a" aria-hidden="true" />
      <div className="landing-glow landing-glow-b" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link className="landing-logo" to="/">
            <span className="landing-logo-mark">S</span>
            <span>
              <strong>SAMS</strong>
              <small>Arba Minch University</small>
            </span>
          </Link>
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Roles</a>
          </nav>
          <Link className="btn btn-primary btn-inline landing-nav-cta" to="/login">
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-eyebrow">Smart Attendance Management System</p>
            <h1>
              Attendance made <span className="landing-gradient-text">effortless</span> with face
              recognition
            </h1>
            <p className="landing-lead">
              SAMS automates class attendance for Arba Minch University — accurate, fast, and built
              for modern academic workflows.
            </p>
            <div className="landing-hero-actions">
              <Link className="btn btn-primary btn-inline" to="/login">
                Get started
              </Link>
              <a className="btn btn-secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="landing-hero-stats">
              <div>
                <strong>Contactless</strong>
                <span>Biometric verification</span>
              </div>
              <div>
                <strong>Real-time</strong>
                <span>Live session capture</span>
              </div>
              <div>
                <strong>Insightful</strong>
                <span>Attendance analytics</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-mockup">
              <div className="landing-mockup-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-mockup-body">
                <div className="landing-mockup-sidebar" />
                <div className="landing-mockup-main">
                  <div className="landing-mockup-card" />
                  <div className="landing-mockup-card" />
                  <div className="landing-mockup-card wide" />
                  <div className="landing-mockup-scan">
                    <div className="landing-mockup-face" />
                    <p>Recognizing…</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Capabilities</p>
            <h2>Everything you need for digital attendance</h2>
            <p className="landing-section-lead">
              From student onboarding to department-level reporting — one cohesive platform.
            </p>
          </div>
          <div className="landing-features">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section-alt" id="how-it-works">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Workflow</p>
            <h2>How SAMS works</h2>
            <p className="landing-section-lead">
              A simple four-step process from registration to reporting.
            </p>
          </div>
          <div className="landing-steps">
            {STEPS.map((item) => (
              <article key={item.step} className="landing-step">
                <span className="landing-step-num">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="roles">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Stakeholders</p>
            <h2>Built for every role on campus</h2>
          </div>
          <div className="landing-roles">
            {ROLES.map((item) => (
              <article key={item.role} className="landing-role-card">
                <h3>{item.role}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-cta-inner">
            <h2>Ready to modernize attendance?</h2>
            <p>Sign in with your institutional account to access the SAMS dashboard.</p>
            <Link className="btn btn-primary btn-inline landing-cta-btn" to="/login">
              Sign in to SAMS
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          <strong>SAMS</strong> — Smart Attendance Management System
        </p>
        <p className="muted">Arba Minch University · Face Recognition Attendance</p>
      </footer>
    </div>
  );
}
