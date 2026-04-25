import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";

export type OverviewPeriod = "7d" | "30d" | "90d" | "all";

// Em segundos — estimativa conservadora do quanto o professor economiza por
// questão corrigida automaticamente (papel: ler, conferir gabarito, anotar).
const SECONDS_SAVED_PER_QUESTION = 30;

interface Input {
  ownerId: string;
  period: OverviewPeriod;
}

export interface OverviewResponse {
  period: OverviewPeriod;
  periodStart: string | null; // ISO; null quando "all"
  generatedAt: string;
  summary: {
    examsCreated: number;
    submissionsReceived: number;
    averageScore: number | null; // 0..10
    questionsGraded: number;
    estimatedTimeSavedSeconds: number;
  };
  activity: Array<{
    /** ISO date (YYYY-MM-DD). */
    date: string;
    submissions: number;
    averageScore: number | null;
  }>;
  scoreDistribution: Array<{
    /** "0-1", "1-2", ..., "9-10" */
    range: string;
    count: number;
  }>;
  lowPerformanceExams: Array<{
    examId: string;
    title: string;
    classId: string;
    className: string;
    submissionsCount: number;
    averageScore: number;
  }>;
  classesRanking: Array<{
    classId: string;
    className: string;
    studentCount: number;
    submissionsInPeriod: number;
    averageScore: number | null;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    classId: string;
    className: string;
    lastScore: number;
    lastExamTitle: string;
    lastSubmittedAt: string;
  }>;
}

/**
 * Computa todos os dados agregados da tela de Análises num único endpoint.
 * Em vez de N queries do frontend, mandamos um objeto com o que cada seção
 * precisa. Mongo faz o heavy-lifting via aggregation pipelines.
 */
export class ComputeOverviewUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<OverviewResponse> {
    const now = new Date();
    const periodStart = resolvePeriodStart(input.period, now);
    const submittedMatch = {
      ownerId: input.ownerId,
      status: "submitted" as const,
      ...(periodStart ? { submittedAt: { $gte: periodStart } } : {}),
    };

    // 1) Submissions — tudo que gira em torno de nota fica aqui, num $facet.
    const [subsFacet] = await SubmissionModel.aggregate<FacetResult>([
      { $match: submittedMatch },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgScore: { $avg: "$score" },
                sumQuestions: { $sum: "$questionCount" },
              },
            },
          ],
          activity: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" },
                },
                count: { $sum: 1 },
                avgScore: { $avg: "$score" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          distribution: [
            {
              $bucket: {
                groupBy: "$score",
                // 0-1, 1-2, ..., 9-10 (último bucket absorve exatamente 10).
                boundaries: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.01],
                default: "other",
                output: { count: { $sum: 1 } },
              },
            },
          ],
          lowExams: [
            {
              $group: {
                _id: "$examId",
                count: { $sum: 1 },
                avgScore: { $avg: "$score" },
              },
            },
            { $match: { count: { $gte: 3 } } },
            { $sort: { avgScore: 1 } },
            { $limit: 5 },
          ],
          perClass: [
            {
              $group: {
                _id: "$classId",
                count: { $sum: 1 },
                avgScore: { $avg: "$score" },
              },
            },
          ],
          // Alunos em risco: última submissão por aluno (na janela) < 6.
          atRisk: [
            { $sort: { submittedAt: -1 } },
            {
              $group: {
                _id: "$studentId",
                score: { $first: "$score" },
                submittedAt: { $first: "$submittedAt" },
                examId: { $first: "$examId" },
                studentName: { $first: "$studentName" },
                studentCode: { $first: "$studentCode" },
                classId: { $first: "$classId" },
              },
            },
            { $match: { score: { $lt: 6 } } },
            { $sort: { score: 1, submittedAt: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]).exec();

    // 2) Turmas e provas do professor (pra preencher nomes + contagens que
    //    a agregação das submissions não tem).
    const [allClasses, classStudentCounts] = await Promise.all([
      this.classes.findByOwner(input.ownerId),
      countStudentsByClass(input.ownerId),
    ]);
    const classMap = new Map(
      allClasses.map((c) => [c.id.toString(), c.name]),
    );

    const allExamsInPeriod = periodStart
      ? await this.exams
          .findByOwnerId(input.ownerId)
          .then((list) =>
            list.filter((e) => e.createdAt.getTime() >= periodStart.getTime()),
          )
      : await this.exams.findByOwnerId(input.ownerId);

    // Map de todos os exams pra lookup rápido (nome + classId) quando a
    // agregação devolve só examId.
    const allExams = await this.exams.findByOwnerId(input.ownerId);
    const examMap = new Map(
      allExams.map((e) => [
        e.id.toString(),
        { title: e.title, classId: e.classId },
      ]),
    );

    // 3) Monta resposta.
    const summary = subsFacet?.summary[0] ?? {
      count: 0,
      avgScore: null,
      sumQuestions: 0,
    };

    const activityMap = new Map(
      (subsFacet?.activity ?? []).map((a) => [
        a._id,
        { count: a.count, avgScore: a.avgScore },
      ]),
    );
    const activity = buildActivityTimeline(activityMap, periodStart, now);

    const distribution = buildDistribution(subsFacet?.distribution ?? []);

    const lowPerformanceExams = (subsFacet?.lowExams ?? [])
      .map((row) => {
        const exam = examMap.get(row._id);
        if (!exam) return null;
        return {
          examId: row._id,
          title: exam.title,
          classId: exam.classId,
          className: classMap.get(exam.classId) ?? "Turma removida",
          submissionsCount: row.count,
          averageScore: round1(row.avgScore),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const perClassMap = new Map(
      (subsFacet?.perClass ?? []).map((c) => [
        c._id,
        { count: c.count, avgScore: c.avgScore },
      ]),
    );

    const classesRanking = allClasses
      .map((c) => {
        const id = c.id.toString();
        const stats = perClassMap.get(id);
        return {
          classId: id,
          className: c.name,
          studentCount: classStudentCounts.get(id) ?? 0,
          submissionsInPeriod: stats?.count ?? 0,
          averageScore: stats ? round1(stats.avgScore) : null,
        };
      })
      .sort((a, b) => {
        // Turmas com nota primeiro, depois por média desc, depois por submissions.
        if (a.averageScore === null && b.averageScore !== null) return 1;
        if (b.averageScore === null && a.averageScore !== null) return -1;
        if (a.averageScore !== null && b.averageScore !== null) {
          return b.averageScore - a.averageScore;
        }
        return b.submissionsInPeriod - a.submissionsInPeriod;
      });

    const atRiskStudents = (subsFacet?.atRisk ?? []).map((s) => {
      const exam = examMap.get(s.examId);
      return {
        studentId: s._id,
        studentName: s.studentName,
        studentCode: s.studentCode,
        classId: s.classId,
        className: classMap.get(s.classId) ?? "Turma removida",
        lastScore: round1(s.score),
        lastExamTitle: exam?.title ?? "Prova removida",
        lastSubmittedAt: s.submittedAt.toISOString(),
      };
    });

    return {
      period: input.period,
      periodStart: periodStart?.toISOString() ?? null,
      generatedAt: now.toISOString(),
      summary: {
        examsCreated: allExamsInPeriod.length,
        submissionsReceived: summary.count,
        averageScore: summary.count > 0 ? round1(summary.avgScore) : null,
        questionsGraded: summary.sumQuestions,
        estimatedTimeSavedSeconds:
          summary.sumQuestions * SECONDS_SAVED_PER_QUESTION,
      },
      activity,
      scoreDistribution: distribution,
      lowPerformanceExams,
      classesRanking,
      atRiskStudents,
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

interface FacetSummaryRow {
  count: number;
  avgScore: number | null;
  sumQuestions: number;
}
interface FacetActivityRow {
  _id: string;
  count: number;
  avgScore: number;
}
interface FacetBucketRow {
  _id: number | "other";
  count: number;
}
interface FacetExamRow {
  _id: string;
  count: number;
  avgScore: number;
}
interface FacetClassRow {
  _id: string;
  count: number;
  avgScore: number;
}
interface FacetAtRiskRow {
  _id: string;
  score: number;
  submittedAt: Date;
  examId: string;
  studentName: string;
  studentCode: string;
  classId: string;
}
interface FacetResult {
  summary: FacetSummaryRow[];
  activity: FacetActivityRow[];
  distribution: FacetBucketRow[];
  lowExams: FacetExamRow[];
  perClass: FacetClassRow[];
  atRisk: FacetAtRiskRow[];
}

function resolvePeriodStart(period: OverviewPeriod, now: Date): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

function buildActivityTimeline(
  map: Map<string, { count: number; avgScore: number }>,
  periodStart: Date | null,
  now: Date,
): Array<{ date: string; submissions: number; averageScore: number | null }> {
  // Sem filtro de período → devolve só os dias que têm dados (ordenados).
  if (!periodStart) {
    return [...map.entries()]
      .map(([date, v]) => ({
        date,
        submissions: v.count,
        averageScore: round1(v.avgScore),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  // Com período fixo → preenche dias vazios com 0 pro chart ter baseline.
  const out: Array<{ date: string; submissions: number; averageScore: number | null }> = [];
  const cursor = new Date(periodStart);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    const v = map.get(key);
    out.push({
      date: key,
      submissions: v?.count ?? 0,
      averageScore: v ? round1(v.avgScore) : null,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function buildDistribution(
  rows: FacetBucketRow[],
): Array<{ range: string; count: number }> {
  const map = new Map<number, number>();
  for (const r of rows) {
    if (r._id === "other") continue;
    // _id é o boundary inferior do bucket (0, 1, ..., 9).
    const lower = Math.floor(r._id);
    map.set(lower, (map.get(lower) ?? 0) + r.count);
  }
  return Array.from({ length: 10 }, (_, i) => ({
    range: `${i}-${i + 1}`,
    count: map.get(i) ?? 0,
  }));
}

function round1(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(value * 10) / 10;
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
