import { api } from "./client";

export function fetchUsers(role) {
  const suffix = role ? `/?role=${encodeURIComponent(role)}` : "/";
  return api(`/api/users${suffix}`);
}

export function fetchUserStats() {
  return api("/api/users/stats");
}

export function fetchDepartments() {
  return api("/api/departments/");
}

export function createUser(payload) {
  return api("/api/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id, payload) {
  return api(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id) {
  return api(`/api/users/${id}`, { method: "DELETE" });
}
