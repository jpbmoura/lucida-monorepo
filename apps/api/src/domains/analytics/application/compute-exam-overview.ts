import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import {
  buildDistribution,
  round1,
  type DifficultyKey,
  type DifficultyStat,
  type ScoreDistributionBucket,
} from "./shared-types.js";

interface Input {
  examId: string;
  ownerId: string;
}

export interface ExamOverviewResponse {
  exam: {
    id: string;
    title: string;
    description: string;
    classId: string;
    className: string;
    questionCount: number;
    duration: number;
    securityLevel: "off" | "strict";
  };
  generatedAt: string;
  summary: {
    submissionsCount: number;
    averageScore: number | null;
    minScore: number | null;
    maxScore: number | null;
    passRate: number | null;
    /** Média em segundos (startedAt → submittedAt); null se não houver dados online. */
    averageDurationSeconds: number | null;
  };
  scoreDistribution: ScoreDistributionBucket[];
  /** Acerto por questão (1-based pra UI). */
  perQuestion: Array<{
    questionNumber: number;
    difficulty: DifficultyKey;
    statement: string;
    correctCount: number;
    totalAnswered: number;
    accuracy: number; // 0..100
  }>;
  difficultyBreakdown: DifficultyStat[];
  studentRanking: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    source: "online" | "scanner";
    score: number;
    correctCount: number;
    submittedAt: string;
  }>;
  sourceBreakdown: {
    online: number;
    scanner: number;
  };
  integrityBreakdown: {
    /** Submissões sem violações. */
    clean: number;
    /** Submissões com pelo menos uma violação registrada. */
    withViolations: number;
    /** Submissões finalizadas automaticamente por violação. */
    terminatedByViolation: number;
  };
}

/**
 * Analytics por prova. Sem filtro de período — escopo já é uma prova só.
 * Cruza Exam.questions × Submission.answers pra ter dados granulares
 * (acerto por questão, por dificuldade).
 */
export class ComputeExamOverviewUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<ExamOverviewResponse> {
    const now = new Date();

    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) {
      throw new ExamNotFoundError();
    }

    const cls = await this.classes.findById(ClassId.of(exam.classId));
    const submissions = await SubmissionModel.find({
      examId: exam.id.toString(),
      ownerId: input.ownerId,
      status: "submitted",
    })
      .lean<SubmissionRow[]>()
      .exec();

    const submissionsCount = submissions.length;
    const scores = submissions.map((s) => s.score);
    const averageScore =
      submissionsCount === 0
        ? null
        : round1(scores.reduce((a, b) => a + b, 0) / submissionsCount);
    const minScore = submissionsCount === 0 ? null : round1(Math.min(...scores));
    const maxScore = submissionsCount === 0 ? null : round1(Math.max(...scores));
    const passCount = submissions.filter((s) => s.score >= 6).length;
    const passRate =
      submissionsCount === 0
        ? null
        : Math.round((passCount / submissionsCount) * 100);

    // Duração média (só online — scanner tem startedAt = submittedAt).
    const onlineSubs = submissions.filter((s) => (s.source ?? "online") === "online");
    const durations = onlineSubs
      .map((s) =>
        s.startedAt && s.submittedAt
          ? Math.max(0, (s.submittedAt.getTime() - s.startedAt.getTime()) / 1000)
          : null,
      )
      .filter((v): v is number => v !== null && v > 0);
    const averageDurationSeconds =
      durations.length === 0
        ? null
        : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

    // ───── per question ─────
    const perQuestionCounters = exam.questions.map(() => ({
      correct: 0,
      total: 0,
    }));
    for (const sub of submissions) {
      exam.questions.forEach((q, i) => {
        const answered = sub.answers[i];
        if (answered === null || answered === undefined) return;
        const c = perQuestionCounters[i];
        if (!c) return;
        c.total += 1;
        if (answered === q.correctAnswer) c.correct += 1;
      });
    }
    const perQuestion = exam.questions.map((q, i) => {
      const c = perQuestionCounters[i] ?? { correct: 0, total: 0 };
      return {
        questionNumber: i + 1,
        difficulty: q.difficulty,
        statement: q.statement,
        correctCount: c.correct,
        totalAnswered: c.total,
        accuracy: c.total === 0 ? 0 : Math.round((c.correct / c.total) * 100),
      };
    });

    // ───── difficulty breakdown (derivado do perQuestion) ─────
    const diffTotals: Record<DifficultyKey, { total: number; correct: number }> =
      {
        "fácil": { total: 0, correct: 0 },
        "médio": { total: 0, correct: 0 },
        "difícil": { total: 0, correct: 0 },
      };
    for (const row of perQuestion) {
      const bucket = diffTotals[row.difficulty];
      bucket.total += row.totalAnswered;
      bucket.correct += row.correctCount;
    }
    const difficultyBreakdown: DifficultyStat[] = (
      Object.keys(diffTotals) as DifficultyKey[]
    ).map((difficulty) => {
      const { total, correct } = diffTotals[difficulty];
      return {
        difficulty,
        totalQuestions: total,
        correctCount: correct,
        accuracy: total === 0 ? null : Math.round((correct / total) * 100),
      };
    });

    // ───── student ranking ─────
    const studentRanking = submissions
      .filter((s): s is SubmissionRow & { submittedAt: Date } =>
        s.submittedAt !== null,
      )
      .map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        studentCode: s.studentCode,
        source: (s.source ?? "online") as "online" | "scanner",
        score: round1(s.score),
        correctCount: s.correctCount,
        submittedAt: s.submittedAt.toISOString(),
      }))
      .sort((a, b) => b.score - a.score);

    // ───── source breakdown ─────
    const sourceBreakdown = {
      online: submissions.filter((s) => (s.source ?? "online") === "online").length,
      scanner: submissions.filter((s) => s.source === "scanner").length,
    };

    // ───── integrity breakdown ─────
    const withViolations = submissions.filter(
      (s) => (s.integrityFlags?.violationCount ?? 0) > 0,
    ).length;
    const terminatedByViolation = submissions.filter(
      (s) => s.endReason === "violation",
    ).length;
    const integrityBreakdown = {
      clean: submissionsCount - withViolations,
      withViolations,
      terminatedByViolation,
    };

    return {
      exam: {
        id: exam.id.toString(),
        title: exam.title,
        description: exam.description,
        classId: exam.classId,
        className: cls?.name ?? "Turma removida",
        questionCount: exam.questions.length,
        duration: exam.duration,
        securityLevel: exam.securityLevel,
      },
      generatedAt: now.toISOString(),
      summary: {
        submissionsCount,
        averageScore,
        minScore,
        maxScore,
        passRate,
        averageDurationSeconds,
      },
      scoreDistribution: buildDistribution(scores),
      perQuestion,
      difficultyBreakdown,
      studentRanking,
      sourceBreakdown,
      integrityBreakdown,
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
  source?: "online" | "scanner";
  score: number;
  correctCount: number;
  questionCount: number;
  answers: Array<number | null>;
  startedAt: Date | null;
  submittedAt: Date | null;
  endReason: "submitted" | "time_expired" | "violation" | "abandoned" | null;
  integrityFlags?: { violationCount?: number };
}
