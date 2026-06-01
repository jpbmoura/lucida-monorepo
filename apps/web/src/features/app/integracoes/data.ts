import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { ClassroomStatusDTO, ClassroomCourseDTO } from "./types";

/** Estado da conexão do professor com o Google Classroom (não fala com o Google). */
export async function fetchClassroomStatus(): Promise<ClassroomStatusDTO> {
  const res = await apiFetch<{ data: ClassroomStatusDTO }>(
    "/v1/integrations/classroom/status",
  );
  return res.data;
}

/**
 * Turmas ACTIVE do professor no Classroom + flag de importada. Chama o
 * Google — só use quando a conta está conectada.
 */
export async function fetchClassroomCourses(): Promise<ClassroomCourseDTO[]> {
  const res = await apiFetch<{ data: ClassroomCourseDTO[] }>(
    "/v1/integrations/classroom/courses",
  );
  return res.data;
}
