import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface AssistantTeacherDTO {
  id: string;
  teacherUserId: string;
  teacherName: string | null;
  teacherEmail: string;
  organizationId: string;
  organizationName: string | null;
  createdAt: string;
}

export async function fetchAssistantTeachers(): Promise<AssistantTeacherDTO[]> {
  try {
    const res = await apiFetch<{ teachers: AssistantTeacherDTO[] }>(
      "/v1/iam/assistant/teachers",
    );
    return res.teachers;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return [];
    throw err;
  }
}
