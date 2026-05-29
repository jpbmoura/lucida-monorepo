import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { LessonPlanDTO, LessonPlanListItem } from "./types";

export async function fetchLessonPlan(id: string): Promise<LessonPlanDTO> {
  const res = await apiFetch<{ data: LessonPlanDTO }>(
    `/v1/lesson-plans/${encodeURIComponent(id)}`,
  );
  return res.data;
}

export async function fetchLessonPlansByClass(
  classId: string,
): Promise<LessonPlanListItem[]> {
  const res = await apiFetch<{ data: LessonPlanListItem[] }>(
    `/v1/classes/${encodeURIComponent(classId)}/lesson-plans`,
  );
  return res.data;
}
