import { api } from "./client";

export function fetchInstructorCourses() {
  return api("/api/courses/");
}
