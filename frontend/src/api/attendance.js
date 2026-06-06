import { api } from "./client";

export function fetchActiveSession() {
  return api("/api/attendance/sessions/active");
}

export function startAttendanceSession(courseId) {
  return api("/api/attendance/sessions", {
    method: "POST",
    body: JSON.stringify(courseId ? { course_id: courseId } : {}),
  });
}

export function recognizeAttendance(sessionId, imageData) {
  return api(`/api/attendance/sessions/${sessionId}/recognize`, {
    method: "POST",
    body: JSON.stringify({ image_data: imageData }),
  });
}

export function closeAttendanceSession(sessionId) {
  return api(`/api/attendance/sessions/${sessionId}/close`, {
    method: "POST",
  });
}
