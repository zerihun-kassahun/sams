import { api } from "./client";

function withDateFilters(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== "" && value != null);
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export function fetchInstructorReportSessions(filters = {}) {
  return api(`/api/reports/instructor/sessions${withDateFilters(filters)}`);
}

export function fetchInstructorSessionReport(sessionId) {
  return api(`/api/reports/instructor/sessions/${sessionId}`);
}

export function fetchInstructorCourseSummary(filters = {}) {
  return api(`/api/reports/instructor/summary${withDateFilters(filters)}`);
}

export function fetchDepartmentSummary(filters = {}) {
  return api(`/api/reports/department/summary${withDateFilters(filters)}`);
}

export function fetchDepartmentSections() {
  return api("/api/reports/department/sections");
}

export function fetchDepartmentSectionReport(sectionId, filters = {}) {
  return api(`/api/reports/department/sections/${sectionId}${withDateFilters(filters)}`);
}
