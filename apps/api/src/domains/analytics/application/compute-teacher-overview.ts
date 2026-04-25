import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { LedgerRepository } from "@/domains/billing/domain/ledger-repository.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";

export type TeacherOverviewPeriod = "7d" | "30d" | "90d" | "all";

interface Input {
  organizationId: string;
  teacherId: string;
  period: TeacherOverviewPeriod;
  /**
   * Quantas entradas do ledger institucional (consumo desse professor do
   * pool) devolver. Default 50 — drill-down quer profundidade pra owner
   * acompanhar consumo.
   */
  ledgerLimit?: number;
  /** Quantas provas recentes listar. Default 50. */
  examsLimit?: number;
  /** Quantos alunos retornar (todas as turmas do professor). Default 100. */
  studentsLimit?: number;
}

export class TeacherNotInOrganizationError extends DomainError {
  readonly code = "TEACHER_NOT_IN_ORGANIZATION";
  readonly statusCode = 404;
  constructor() {
    super("Este professor não pertence à instituição ativa.");
  }
}

export interface TeacherOverviewResponse {
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
    averageScore: number | null; // 0..10
    creditsConsumed: number;
    lastActivityAt: string | null;
  };
  classes: Array<{
    classId: string;
    name: string;
    studentCount: number;
    examCount: number;
  }>;
  recentExams: Array<{
    examId: string;
    title: string;
    classId: string;
    className: string;
    createdAt: string;
    questionCount: number;
  }>;
  /** Alunos do professor (de todas as turmas dele), top N por createdAt desc. */
  students: Array<{
    studentId: string;
    name: string;
    code: string;
    matricula: string;
    email: string | null;
    classId: string;
    className: string;
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
 * Drill-down de um professor no painel da instituição. Agrega dados por
 * `ownerId = teacherId` (provas, turmas, submissões) no período + filtra o
 * ledger institucional por `actorUserId = teacherId` (quanto o professor
 * consumiu do pool).
 *
 * Valida que o teacher é member da org ativa — previne vazamento de dados
 * quando alguém tenta espiar um userId que não faz parte da instituição.
 */
export class ComputeTeacherOverviewUseCase {
  constructor(
    private readonly members: OrganizationMembersRepository,
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
    private readonly ledger: LedgerRepository,
  ) {}

  async execute(input: Input): Promise<TeacherOverviewResponse> {
    const now = new Date();
    const periodStart = resolvePeriodStart(input.period, now);
    const ledgerLimit = input.ledgerLimit ?? 50;
    const examsLimit = input.examsLimit ?? 50;
    const studentsLimit = input.studentsLimit ?? 100;

    // Valida: é member da org atual?
    const orgMembers = await this.members.listMembers(input.organizationId);
    const teacherMember = orgMembers.find((m) => m.userId === input.teacherId);
    if (!teacherMember) {
      throw new TeacherNotInOrganizationError();
    }

    const [allClasses, allExams, submissionStats, ledgerEntries, studentDocs] =
      await Promise.all([
        this.classes.findByOwner(input.teacherId),
        this.exams.findByOwnerId(input.teacherId),
        aggregateSubmissionsForOwner(input.teacherId, periodStart),
        this.ledger.findByOwner({
          ownerId: input.organizationId,
          scope: "org",
          limit: 200,
        }),
        StudentModel.find({ ownerId: input.teacherId })
          .sort({ createdAt: -1 })
          .limit(studentsLimit)
          .lean()
          .exec(),
      ]);

    // Filtra ledger institucional pelo professor (actorUserId).
    const teacherLedger = ledgerEntries.filter(
      (e) => e.actorUserId === input.teacherId,
    );

    // Exams no período (ordenados por createdAt desc).
    const examsInPeriod = periodStart
      ? allExams.filter(
          (e) => e.createdAt.getTime() >= periodStart.getTime(),
        )
      : allExams;

    const recentExams = [...examsInPeriod]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, examsLimit);

    // Student count + exam count por classe.
    const classStudentCounts = await countStudentsByClass(input.teacherId);
    const classExamCounts = new Map<string, number>();
    for (const ex of allExams) {
      classExamCounts.set(
        ex.classId,
        (classExamCounts.get(ex.classId) ?? 0) + 1,
      );
    }

    const classMap = new Map(allClasses.map((c) => [c.id.toString(), c]));

    // Soma consumo desse professor no período (debits com ai_consumption).
    const creditsConsumed = teacherLedger
      .filter((e) => {
        if (e.type !== "debit") return false;
        if (!periodStart) return true;
        return e.createdAt.getTime() >= periodStart.getTime();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastActivityAt = maxDate([
      recentExams[0]?.createdAt ?? null,
      submissionStats.lastSubmittedAt,
      teacherLedger[0]?.createdAt ?? null,
    ]);

    return {
      period: input.period,
      periodStart: periodStart?.toISOString() ?? null,
      generatedAt: now.toISOString(),
      teacher: {
        id: teacherMember.userId,
        name: teacherMember.name,
        email: teacherMember.email,
        image: teacherMember.image,
        role: teacherMember.role,
        joinedAt: teacherMember.joinedAt.toISOString(),
      },
      summary: {
        examsCreated: examsInPeriod.length,
        submissionsReceived: submissionStats.count,
        averageScore:
          submissionStats.count > 0
            ? round1(submissionStats.avgScore)
            : null,
        creditsConsumed,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
      },
      classes: allClasses
        .map((c) => ({
          classId: c.id.toString(),
          name: c.name,
          studentCount: classStudentCounts.get(c.id.toString()) ?? 0,
          examCount: classExamCounts.get(c.id.toString()) ?? 0,
        }))
        .sort((a, b) => b.examCount - a.examCount || a.name.localeCompare(b.name)),
      recentExams: recentExams.map((ex) => ({
        examId: ex.id.toString(),
        title: ex.title,
        classId: ex.classId,
        className: classMap.get(ex.classId)?.name ?? "Turma removida",
        createdAt: ex.createdAt.toISOString(),
        questionCount: ex.questions.length,
      })),
      students: studentDocs.map((s) => ({
        studentId: s._id,
        name: s.name,
        code: s.code,
        matricula: s.matricula,
        email: s.email,
        classId: s.classId,
        className: classMap.get(s.classId)?.name ?? "Turma removida",
        createdAt: s.createdAt.toISOString(),
      })),
      ledger: teacherLedger.slice(0, ledgerLimit).map((e) => ({
        id: e.id.toString(),
        type: e.type,
        amount: e.amount,
        reason: e.reason,
        relatedAction: e.relatedAction,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

async function aggregateSubmissionsForOwner(
  ownerId: string,
  periodStart: Date | null,
): Promise<{
  count: number;
  avgScore: number;
  lastSubmittedAt: Date | null;
}> {
  const match: Record<string, unknown> = {
    ownerId,
    status: "submitted",
  };
  if (periodStart) match.submittedAt = { $gte: periodStart };

  const [row] = await SubmissionModel.aggregate<{
    count: number;
    avgScore: number;
    lastSubmittedAt: Date;
  }>([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgScore: { $avg: "$score" },
        lastSubmittedAt: { $max: "$submittedAt" },
      },
    },
  ]).exec();

  if (!row) {
    return { count: 0, avgScore: 0, lastSubmittedAt: null };
  }
  return {
    count: row.count,
    avgScore: row.avgScore,
    lastSubmittedAt: row.lastSubmittedAt ?? null,
  };
}

async function countStudentsByClass(
  ownerId: string,
): Promise<Map<string, number>> {
  const rows = await StudentModel.aggregate<{ _id: string; count: number }>([
    { $match: { ownerId } },
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]).exec();
  return new Map(rows.map((r) => [r._id, r.count]));
}

function resolvePeriodStart(
  period: TeacherOverviewPeriod,
  now: Date,
): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

function maxDate(dates: Array<Date | null>): Date | null {
  let max: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (!max || d.getTime() > max.getTime()) max = d;
  }
  return max;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
