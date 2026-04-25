import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";
import { ExamModel } from "@/domains/exam/infrastructure/exam-schema.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";

export type OrgOverviewPeriod = "7d" | "30d" | "90d" | "all";

interface Input {
  organizationId: string;
  period: OrgOverviewPeriod;
}

export interface OrgOverviewResponse {
  period: OrgOverviewPeriod;
  periodStart: string | null; // ISO; null quando "all"
  generatedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  summary: {
    totalTeachers: number;
    /** Criou prova OU recebeu submissão no período filtrado. */
    activeTeachers: number;
    examsCreated: number;
    submissionsReceived: number;
    /** Média ponderada por número de submissões. 0..10. */
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
    /** 0..10, média das submissões recebidas no período. */
    averageScore: number | null;
    lastActivityAt: string | null; // ISO
    atRisk: boolean;
    atRiskReason: string | null;
  }>;
  /** Subset de `teachers` com atRisk=true, ordenado da pior média pra melhor. */
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
 * Dashboard agregado por organização. Lista members via BA plugin, agrega
 * exams/submissions por ownerId, e compõe per-teacher + summary.
 *
 * "At-risk": média dos alunos (score médio 0..10) < 5 E teve ao menos 1
 * submissão no período. Essa é a definição do MVP — mais critérios podem
 * entrar depois (ex: inatividade > 30d, taxa de conclusão baixa).
 */
const AT_RISK_AVG_THRESHOLD = 5;

export class ComputeOrgOverviewUseCase {
  constructor(private readonly members: OrganizationMembersRepository) {}

  async execute(input: Input): Promise<OrgOverviewResponse> {
    const now = new Date();
    const periodStart = resolvePeriodStart(input.period, now);

    const [org, orgMembers] = await Promise.all([
      this.members.getOrganization(input.organizationId),
      this.members.listMembers(input.organizationId),
    ]);

    if (orgMembers.length === 0) {
      return emptyResponse(input, now, periodStart, org);
    }

    const memberIds = orgMembers.map((m) => m.userId);

    const [examStats, submissionStats] = await Promise.all([
      aggregateExamsByOwners(memberIds, periodStart),
      aggregateSubmissionsByOwners(memberIds, periodStart),
    ]);

    const teachers: OrgOverviewResponse["teachers"] = orgMembers.map((m) => {
      const examRow = examStats.get(m.userId);
      const subRow = submissionStats.get(m.userId);

      const submissionsReceived = subRow?.count ?? 0;
      const averageScore =
        submissionsReceived > 0 && subRow ? round1(subRow.avgScore) : null;
      const lastActivityAt = maxDate(
        examRow?.lastActivityAt ?? null,
        subRow?.lastActivityAt ?? null,
      );

      const atRisk =
        averageScore !== null && averageScore < AT_RISK_AVG_THRESHOLD;

      return {
        id: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
        role: m.role,
        examsCreated: examRow?.count ?? 0,
        submissionsReceived,
        averageScore,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        atRisk,
        atRiskReason: atRisk
          ? `Média dos alunos abaixo de ${AT_RISK_AVG_THRESHOLD.toFixed(1)}`
          : null,
      };
    });

    const examsCreated = teachers.reduce((s, t) => s + t.examsCreated, 0);
    const submissionsReceived = teachers.reduce(
      (s, t) => s + t.submissionsReceived,
      0,
    );
    const activeTeachers = teachers.filter(
      (t) => t.examsCreated > 0 || t.submissionsReceived > 0,
    ).length;

    const overallAverage = computeWeightedAverage(teachers);

    const atRiskTeachers = teachers
      .filter((t) => t.atRisk && t.averageScore !== null)
      .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
      .map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        averageScore: t.averageScore as number,
        submissionsReceived: t.submissionsReceived,
        reason: t.atRiskReason as string,
      }));

    // Ordena a lista geral: at-risk primeiro (chama atenção), depois por
    // volume de provas criadas desc, depois alfabético por nome.
    teachers.sort((a, b) => {
      if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
      if (a.examsCreated !== b.examsCreated) {
        return b.examsCreated - a.examsCreated;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      period: input.period,
      periodStart: periodStart?.toISOString() ?? null,
      generatedAt: now.toISOString(),
      organization: {
        id: input.organizationId,
        name: org?.name ?? "Instituição",
        slug: org?.slug ?? "",
      },
      summary: {
        totalTeachers: orgMembers.length,
        activeTeachers,
        examsCreated,
        submissionsReceived,
        overallAverage,
      },
      teachers,
      atRiskTeachers,
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

async function aggregateExamsByOwners(
  ownerIds: string[],
  periodStart: Date | null,
): Promise<Map<string, { count: number; lastActivityAt: Date }>> {
  const match: Record<string, unknown> = { ownerId: { $in: ownerIds } };
  if (periodStart) match.createdAt = { $gte: periodStart };

  const rows = await ExamModel.aggregate<{
    _id: string;
    count: number;
    lastCreatedAt: Date;
  }>([
    { $match: match },
    {
      $group: {
        _id: "$ownerId",
        count: { $sum: 1 },
        lastCreatedAt: { $max: "$createdAt" },
      },
    },
  ]).exec();

  return new Map(
    rows.map((r) => [
      r._id,
      { count: r.count, lastActivityAt: r.lastCreatedAt },
    ]),
  );
}

async function aggregateSubmissionsByOwners(
  ownerIds: string[],
  periodStart: Date | null,
): Promise<
  Map<string, { count: number; avgScore: number; lastActivityAt: Date }>
> {
  const match: Record<string, unknown> = {
    ownerId: { $in: ownerIds },
    status: "submitted",
  };
  if (periodStart) match.submittedAt = { $gte: periodStart };

  const rows = await SubmissionModel.aggregate<{
    _id: string;
    count: number;
    avgScore: number;
    lastSubmittedAt: Date;
  }>([
    { $match: match },
    {
      $group: {
        _id: "$ownerId",
        count: { $sum: 1 },
        avgScore: { $avg: "$score" },
        lastSubmittedAt: { $max: "$submittedAt" },
      },
    },
  ]).exec();

  return new Map(
    rows.map((r) => [
      r._id,
      {
        count: r.count,
        avgScore: r.avgScore,
        lastActivityAt: r.lastSubmittedAt,
      },
    ]),
  );
}

function computeWeightedAverage(
  teachers: OrgOverviewResponse["teachers"],
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const t of teachers) {
    if (t.averageScore === null || t.submissionsReceived === 0) continue;
    weightedSum += t.averageScore * t.submissionsReceived;
    totalWeight += t.submissionsReceived;
  }
  if (totalWeight === 0) return null;
  return round1(weightedSum / totalWeight);
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() > b.getTime() ? a : b;
}

function resolvePeriodStart(
  period: OrgOverviewPeriod,
  now: Date,
): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function emptyResponse(
  input: Input,
  now: Date,
  periodStart: Date | null,
  org: { id: string; name: string; slug: string } | null,
): OrgOverviewResponse {
  return {
    period: input.period,
    periodStart: periodStart?.toISOString() ?? null,
    generatedAt: now.toISOString(),
    organization: {
      id: input.organizationId,
      name: org?.name ?? "Instituição",
      slug: org?.slug ?? "",
    },
    summary: {
      totalTeachers: 0,
      activeTeachers: 0,
      examsCreated: 0,
      submissionsReceived: 0,
      overallAverage: null,
    },
    teachers: [],
    atRiskTeachers: [],
  };
}
