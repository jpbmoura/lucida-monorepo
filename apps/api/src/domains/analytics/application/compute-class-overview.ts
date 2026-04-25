import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { Exam } from "@/domains/exam/domain/exam.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";
import {
  buildDistribution,
  resolvePeriodStart,
  round1,
  type DifficultyKey,
  type DifficultyStat,
  type OverviewPeriod,
  type ScoreDistributionBucket,
} from "./shared-types.js";

interface Input {
  classId: string;
  ownerId: string;
  period: OverviewPeriod;
}

export interface ClassOverviewResponse {
  class: {
    id: string;
    name: string;
    description: string;
    studentCount: number;
  };
  period: OverviewPeriod;
  periodStart: string | null;
  generatedAt: string;
  summary: {
    examCount: number; // provas da turma
    submissionsReceived: number;
    averageScore: number | null;
    passRate: number | null; // % com score >= 6
  };
  trend: Array<{
    examId: string;
    title: string;
    appliedAt: string; // ISO — primeira submissão, ou createdAt se não houver
    submissionsCount: number;
    averageScore: number;
  }>;
  scoreDistribution: ScoreDistributionBucket[];
  exams: Array<{
    examId: string;
    title: string;
    createdAt: string;
    questionCount: number;
    submissionsCount: number;
    averageScore: number | null;
    passRate: number | null;
  }>;
  studentRanking: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    examsTaken: number;
    averageScore: number;
  }>;
  difficultyBreakdown: DifficultyStat[];
}

/**
 * Analytics agregada por turma. Alimenta /app/analises/turmas/[id].
 * - trend: uma média por prova (ordem cronológica)
 * - ranking: todos os alunos que responderam pelo menos uma prova, ordenado desc
 * - difficultyBreakdown: cruza answers × question.difficulty in-memory (não tem
 *   como fazer isso sem JOIN; scale do professor permite processar em JS).
 */
export class ComputeClassOverviewUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<ClassOverviewResponse> {
    const now = new Date();
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }

    const periodStart = resolvePeriodStart(input.period, now);
    const submittedMatch = {
      classId: cls.id.toString(),
      ownerId: input.ownerId,
      status: "submitted" as const,
      ...(periodStart ? { submittedAt: { $gte: periodStart } } : {}),
    };

    // --- buscas paralelas ---
    const [studentCount, classExams, submissions] = await Promise.all([
      StudentModel.countDocuments({ classId: cls.id.toString() }).exec(),
      this.exams.findByClassId(cls.id.toString()),
      SubmissionModel.find(submittedMatch)
        .lean<SubmissionRow[]>()
        .exec(),
    ]);

    const examMap = new Map<string, Exam>(
      classExams.map((e) => [e.id.toString(), e]),
    );

    // ───── summary ─────
    const scores = submissions.map((s) => s.score);
    const submissionsReceived = submissions.length;
    const averageScore =
      submissionsReceived === 0
        ? null
        : round1(scores.reduce((a, b) => a + b, 0) / submissionsReceived);
    const passCount = submissions.filter((s) => s.score >= 6).length;
    const passRate =
      submissionsReceived === 0
        ? null
        : Math.round((passCount / submissionsReceived) * 100);

    // ───── trend (média por prova, cronológica) ─────
    const byExam = new Map<
      string,
      { count: number; sum: number; firstAt: Date }
    >();
    for (const s of submissions) {
      if (!s.submittedAt) continue;
      const curr = byExam.get(s.examId);
      if (curr) {
        curr.count += 1;
        curr.sum += s.score;
        if (s.submittedAt < curr.firstAt) curr.firstAt = s.submittedAt;
      } else {
        byExam.set(s.examId, {
          count: 1,
          sum: s.score,
          firstAt: s.submittedAt,
        });
      }
    }
    const trend = Array.from(byExam.entries())
      .map(([examId, v]) => {
        const exam = examMap.get(examId);
        return {
          examId,
          title: exam?.title ?? "Prova removida",
          appliedAt: v.firstAt.toISOString(),
          submissionsCount: v.count,
          averageScore: round1(v.sum / v.count),
        };
      })
      .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));

    // ───── distribuição ─────
    const scoreDistribution = buildDistribution(scores);

    // ───── exams da turma (todas, com ou sem submissões no período) ─────
    const exams = classExams.map((e) => {
      const id = e.id.toString();
      const stats = byExam.get(id);
      const examSubs = submissions.filter((s) => s.examId === id);
      const examPass = examSubs.filter((s) => s.score >= 6).length;
      return {
        examId: id,
        title: e.title,
        createdAt: e.createdAt.toISOString(),
        questionCount: e.questions.length,
        submissionsCount: stats?.count ?? 0,
        averageScore: stats ? round1(stats.sum / stats.count) : null,
        passRate:
          examSubs.length === 0
            ? null
            : Math.round((examPass / examSubs.length) * 100),
      };
    });

    // ───── ranking de alunos ─────
    const byStudent = new Map<
      string,
      {
        studentName: string;
        studentCode: string;
        count: number;
        sum: number;
      }
    >();
    for (const s of submissions) {
      const curr = byStudent.get(s.studentId);
      if (curr) {
        curr.count += 1;
        curr.sum += s.score;
      } else {
        byStudent.set(s.studentId, {
          studentName: s.studentName,
          studentCode: s.studentCode,
          count: 1,
          sum: s.score,
        });
      }
    }
    const studentRanking = Array.from(byStudent.entries())
      .map(([studentId, v]) => ({
        studentId,
        studentName: v.studentName,
        studentCode: v.studentCode,
        examsTaken: v.count,
        averageScore: round1(v.sum / v.count),
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // ───── difficulty breakdown ─────
    const difficultyBreakdown = computeDifficultyBreakdown(
      submissions,
      examMap,
    );

    return {
      class: {
        id: cls.id.toString(),
        name: cls.name,
        description: cls.description,
        studentCount,
      },
      period: input.period,
      periodStart: periodStart?.toISOString() ?? null,
      generatedAt: now.toISOString(),
      summary: {
        examCount: classExams.length,
        submissionsReceived,
        averageScore,
        passRate,
      },
      trend,
      scoreDistribution,
      exams,
      studentRanking,
      difficultyBreakdown,
    };
  }
}

// ───── helpers ───────────────────────────────────────────────

interface SubmissionRow {
  _id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  score: number;
  answers: Array<number | null>;
  submittedAt: Date | null;
}

function computeDifficultyBreakdown(
  submissions: SubmissionRow[],
  examMap: Map<string, Exam>,
): DifficultyStat[] {
  const totals: Record<DifficultyKey, { total: number; correct: number }> = {
    "fácil": { total: 0, correct: 0 },
    "médio": { total: 0, correct: 0 },
    "difícil": { total: 0, correct: 0 },
  };

  for (const sub of submissions) {
    const exam = examMap.get(sub.examId);
    if (!exam) continue;
    exam.questions.forEach((q, i) => {
      const answered = sub.answers[i];
      if (answered === null || answered === undefined) return;
      const bucket = totals[q.difficulty];
      bucket.total += 1;
      if (answered === q.correctAnswer) bucket.correct += 1;
    });
  }

  return (Object.keys(totals) as DifficultyKey[]).map((difficulty) => {
    const { total, correct } = totals[difficulty];
    return {
      difficulty,
      totalQuestions: total,
      correctCount: correct,
      accuracy: total === 0 ? null : Math.round((correct / total) * 100),
    };
  });
}
