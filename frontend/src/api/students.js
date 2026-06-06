import { api } from "./client";

function queryString(params) {
  const entries = Object.entries(params).filter(([, value]) => value !== "" && value != null);
  if (!entries.length) return "/";
  const qs = new URLSearchParams(entries).toString();
  return `/?${qs}`;
}

export function fetchStudents(filters = {}) {
  return api(`/api/students${queryString(filters)}`);
}

export function fetchSections(departmentId) {
  const suffix = departmentId ? `/?department_id=${departmentId}` : "/";
  return api(`/api/sections${suffix}`);
}

export function createStudent(payload) {
  return api("/api/students/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStudent(id, payload) {
  return api(`/api/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function captureStudentFace(id, imageData) {
  return api(`/api/students/${id}/capture-face`, {
    method: "POST",
    body: JSON.stringify({ image_data: imageData }),
  });
}

export function deleteStudent(id) {
  return api(`/api/students/${id}`, { method: "DELETE" });
}
