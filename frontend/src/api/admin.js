import { api } from "./client";

export function fetchDatabaseInfo() {
  return api("/api/admin/database");
}

export function createDatabaseBackup() {
  return api("/api/admin/backup", { method: "POST" });
}

export function deleteDatabaseBackup(filename) {
  return api(`/api/admin/backups/${encodeURIComponent(filename)}`, { method: "DELETE" });
}

export async function downloadDatabaseBackup(filename) {
  const response = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Download failed.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export { formatBytes };
