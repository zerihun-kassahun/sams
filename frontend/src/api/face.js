import { api } from "./client";

export function fetchModelStatus() {
  return api("/api/face/model-status");
}

export function prepareRecognition(courseId) {
  return api("/api/face/prepare", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId }),
  });
}

export function clearPreparedModel() {
  return api("/api/face/clear", { method: "POST" });
}
