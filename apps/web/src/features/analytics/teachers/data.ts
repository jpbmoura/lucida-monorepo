import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export type TeacherOverviewPeriod = "7d" | "30d" | "90d" | "all";

export interface TeacherOverviewDTO {
  period: TeacherOverviewPeriod;
  periodStart: string | null;
  generatedAt: string;
  teacher: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: "owner" | "admin" | "member";
    joinedAt: string;
  };
  summary: {
    examsCreated: number;
    submissionsReceived: number;
    averageScore: number | null;
    creditsConsumed: number;
    lastActivityAt: string | null;
  };
  classes: Array<{
    classId: string;
    name: string;
    courseId: string;
    courseName: string;
    studentCount: number;
    examCount: number;
  }>;
  recentExams: Array<{
    examId: string;
    title: string;
    classId: string;
    className: string;
    courseId: string;
    courseName: string;
    createdAt: string;
    questionCount: number;
  }>;
  students: Array<{
    studentId: string;
    name: string;
    code: string;
    matricula: string;
    email: string | null;
    classId: string;
    className: string;
    courseId: string;
    courseName: string;
    createdAt: string;
  }>;
  ledger: Array<{
    id: string;
    type: "credit" | "debit";
    amount: number;
    reason: string;
    relatedAction: string | null;
    createdAt: string;
  }>;
}

/**
 * `null` quando:
 *   - sem org ativa (400),
 *   - professor não faz parte da org ativa (404 TEACHER_NOT_IN_ORGANIZATION),
 *   - user não tem permissão (403).
 * A page renderiza fallback em cada caso com copy específica.
 */
export async function fetchTeacherOverview(
  teacherId: string,
  period: TeacherOverviewPeriod,
): Promise<TeacherOverviewDTO | null> {
  try {
    const res = await apiFetch<{ data: TeacherOverviewDTO }>(
      `/v1/analytics/teachers/${encodeURIComponent(teacherId)}?period=${period}`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError) {
      if (
        err.status === 404 ||
        err.status === 403 ||
        err.code === "MISSING_ACTIVE_ORGANIZATION" ||
        err.code === "TEACHER_NOT_IN_ORGANIZATION"
      ) {
        return null;
      }
    }
    throw err;
  }
}
