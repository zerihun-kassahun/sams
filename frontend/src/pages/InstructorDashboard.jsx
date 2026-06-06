import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { fetchInstructorCourses } from "../api/courses";
import { fetchModelStatus } from "../api/face";
import { INSTRUCTOR_NAV } from "../config/instructorNav";

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState({ trained: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [courseData, statusData] = await Promise.all([
          fetchInstructorCourses(),
          fetchModelStatus(),
        ]);
        setCourses(courseData.courses);
        setStatus(statusData);
      } catch {
        // Dashboard can still render without stats.
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <DashboardLayout title="Instructor Dashboard" roleLabel="Instructor" navItems={INSTRUCTOR_NAV}>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Face recognition</h3>
          <p>{loading ? "..." : status.trained ? "Prepared" : "Not prepared"}</p>
        </div>
        <div className="stat-card">
          <h3>Indexed students</h3>
          <p>{status.trained ? status.student_count : "—"}</p>
        </div>
        <div className="stat-card">
          <h3>Courses</h3>
          <p>{loading ? "..." : courses.length}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Next steps</h2>
        {status.trained ? (
          <p className="muted">
            Recognition is prepared for <strong>{status.course_code}</strong> ({status.section_name}
            ). Start a live attendance session when class begins.
          </p>
        ) : (
          <p className="muted">
            Prepare recognition for a course before starting attendance. Students must be registered
            with captured face images in the matching section.
          </p>
        )}
        <div className="panel-actions">
          <Link className="btn btn-primary btn-inline" to="/instructor/prepare">
            {status.trained ? "Review preparation" : "Prepare recognition"}
          </Link>
          {status.trained && (
            <Link className="btn btn-secondary" to="/instructor/attendance">
              Capture attendance
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
