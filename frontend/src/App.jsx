import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminStudents from "./pages/AdminStudents";
import AdminDatabase from "./pages/AdminDatabase";
import DeptHeadDashboard from "./pages/DeptHeadDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorPrepare from "./pages/InstructorPrepare";
import InstructorAttendance from "./pages/InstructorAttendance";
import InstructorReports from "./pages/InstructorReports";
import DeptHeadReports from "./pages/DeptHeadReports";
import DeptHeadSummary from "./pages/DeptHeadSummary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/database"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDatabase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor"
        element={
          <ProtectedRoute roles={["instructor"]}>
            <InstructorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/prepare"
        element={
          <ProtectedRoute roles={["instructor"]}>
            <InstructorPrepare />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/attendance"
        element={
          <ProtectedRoute roles={["instructor"]}>
            <InstructorAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/reports"
        element={
          <ProtectedRoute roles={["instructor"]}>
            <InstructorReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dept-head"
        element={
          <ProtectedRoute roles={["department_head"]}>
            <DeptHeadDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dept-head/reports"
        element={
          <ProtectedRoute roles={["department_head"]}>
            <DeptHeadReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dept-head/summary"
        element={
          <ProtectedRoute roles={["department_head"]}>
            <DeptHeadSummary />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
