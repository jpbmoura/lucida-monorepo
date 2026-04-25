import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export type OrgOverviewPeriod = "7d" | "30d" | "90d" | "all";

export interface OrgOverviewDTO {
  period: OrgOverviewPeriod;
  periodStart: string | null;
  generatedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  summary: {
    totalTeachers: number;
    activeTeachers: number;
    examsCreated: number;
    submissionsReceived: number;
    /** 0..10, ponderada por número de submissões. */
    overallAverage: number | null;
  };
  teachers: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: "owner" | "admin" | "member";
    examsCreated: number;
    submissionsReceived: number;
    averageScore: number | null;
    lastActivityAt: string | null;
    atRisk: boolean;
    atRiskReason: string | null;
  }>;
  atRiskTeachers: Array<{
    id: string;
    name: string;
    email: string;
    averageScore: number;
    submissionsReceived: number;
    reason: string;
  }>;
}

/**
 * Retorna os dados agregados da organização ativa na sessão. Se não houver
 * org ativa (usuário comum sem membership, ou membership sem `setActive`),
 * a API responde 400 MISSING_ACTIVE_ORGANIZATION — este helper devolve
 * `null` nesse caso pra page escolher um empty-state claro em vez de
 * explodir.
 */
export async function fetchOrgOverview(
  period: OrgOverviewPeriod,
): Promise<OrgOverviewDTO | null> {
  try {
    const res = await apiFetch<{ data: OrgOverviewDTO }>(
      `/v1/analytics/org-overview?period=${period}`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "MISSING_ACTIVE_ORGANIZATION") {
      return null;
    }
    throw err;
  }
}
