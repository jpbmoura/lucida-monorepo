import { StudentId } from "@/domains/student/domain/student-id.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { StudentNotFoundError } from "@/domains/student/domain/student-errors.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { Exam } from "@/domains/exam/domain/exam.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import {
  round1,
  type DifficultyKey,
  type DifficultyStat,
} from "./shared-types.js";

interface Input {
  studentId: string;
  ownerId: string;
}

export interface StudentOverviewResponse {
  student: {
    id: string;
    name: string;
    code: string;
    matricula: string;
    email: string | null;
    classId: string;
    className: string;
  };
  generatedAt: string;
  summary: {
    examsTaken: number;
    examsAvailable: number; // provas da turma com ao menos 1 submissão
    averageScore: number | null;
    /** 1-based; null se o aluno não tem submissões. */
    rankPosition: number | null;
    /** Total de alunos da turma com ao menos uma submissão. */
    rankTotal: number;
    attendanceRate: number | null; // %
  };
  /** Evolução por prova (ordem cronológica de quando o aluno submeteu). */
  trend: Array<{
    examId: string;
    title: string;
    submittedAt: string;
    studentScore: number;
    classAverageScore: number;
  }>;
  exams: Array<{
    examId: string;
    title: string;
    submittedAt: string;
    source: "online" | "scanner";
    studentScore: number;
    correctCount: number;
    questionCount: number;
    classAverageScore: number;
  }>;
  difficultyBreakdown: Array<
    DifficultyStat & { classAccuracy: number | null }
  >;
}

/**
 * Analytics por aluno. Sem período — aluno costuma ter poucos datapoints.
 * Mostra o histórico completo + comparação com a média da turma em cada prova.
 */
export class ComputeStudentOverviewUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<StudentOverviewResponse> {
    const now = new Date();

    const student = await this.students.findById(StudentId.of(input.studentId));
    if (!student || !student.isOwnedBy(input.ownerId)) {
      throw new StudentNotFoundError();
    }

    const cls = await this.classes.findById(ClassId.of(student.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new StudentNotFoundError();
    }

    // Todas as submissões da turma — necessário pra média da turma em cada
    // prova + ranking.
    const allClassSubs = await SubmissionModel.find({
      classId: student.classId,
      ownerId: input.ownerId,
      status: "submitted",
    })
      .lean<SubmissionRow[]>()
      .exec();

    const classExams = await this.exams.findByClassId(student.classId);
    const examMap = new Map<string, Exam>(
      classExams.map((e) => [e.id.toString(), e]),
    );

    const studentSubs = allClassSubs
      .filter((s) => s.studentId === input.studentId)
      .filter((s): s is SubmissionRow & { submittedAt: Date } =>
        s.submittedAt !== null,
      )
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

    // Média da turma por prova (entre quem respondeu).
    const classAvgByExam = new Map<string, number>();
    const classStatsByExam = byExam(allClassSubs);
    for (const [examId, stats] of classStatsByExam.entries()) {
      classAvgByExam.set(examId, stats.sum / stats.count);
    }

    // Ranking: agrupa submissions por aluno e ordena por média.
    const studentAverages = new Map<string, { count: number; sum: number }>();
    for (const s of allClassSubs) {
      const curr = studentAverages.get(s.studentId);
      if (curr) {
        curr.count += 1;
        curr.sum += s.score;
      } else {
        studentAverages.set(s.studentId, { count: 1, sum: s.score });
      }
    }
    const ranked = Array.from(studentAverages.entries())
      .map(([id, v]) => ({ id, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg);
    const rankIdx = ranked.findIndex((r) => r.id === input.studentId);
    const rankPosition = rankIdx === -1 ? null : rankIdx + 1;

    // Summary.
    const scores = studentSubs.map((s) => s.score);
    const examsTaken = studentSubs.length;
    const averageScore =
      examsTaken === 0
        ? null
        : round1(scores.reduce((a, b) => a + b, 0) / examsTaken);
    const examsAvailable = classStatsByExam.size;
    const attendanceRate =
      examsAvailable === 0
        ? null
        : Math.round((examsTaken / examsAvailable) * 100);

    // Trend + exams detalhado.
    const exams = studentSubs.map((s) => {
      const exam = examMap.get(s.examId);
      const classAvg = classAvgByExam.get(s.examId) ?? 0;
      return {
        examId: s.examId,
        title: exam?.title ?? "Prova removida",
        submittedAt: s.submittedAt.toISOString(),
        source: s.source ?? "online",
        studentScore: round1(s.score),
        correctCount: s.correctCount,
        questionCount: s.questionCount,
        classAverageScore: round1(classAvg),
      };
    });

    const trend = exams.map((e) => ({
      examId: e.examId,
      title: e.title,
      submittedAt: e.submittedAt,
      studentScore: e.studentScore,
      classAverageScore: e.classAverageScore,
    }));

    // Difficulty breakdown do aluno + da turma inteira pra contraste.
    const studentBreakdown = computeDifficultyBreakdown(studentSubs, examMap);
    const classBreakdown = computeDifficultyBreakdown(allClassSubs, examMap);
    const classAccuracyByDifficulty = new Map(
      classBreakdown.map((c) => [c.difficulty, c.accuracy]),
    );
    const difficultyBreakdown = studentBreakdown.map((s) => ({
      ...s,
      classAccuracy: classAccuracyByDifficulty.get(s.difficulty) ?? null,
    }));

    return {
      student: {
        id: student.id.toString(),
        name: student.name,
        code: student.code.toString(),
        matricula: student.matricula,
        email: student.email,
        classId: cls.id.toString(),
        className: cls.name,
      },
      generatedAt: now.toISOString(),
      summary: {
        examsTaken,
        examsAvailable,
        averageScore,
        rankPosition,
        rankTotal: ranked.length,
        attendanceRate,
      },
      trend,
      exams,
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
  source?: "online" | "scanner";
  score: number;
  correctCount: number;
  questionCount: number;
  answers: Array<number | null>;
  submittedAt: Date | null;
}

function byExam(
  subs: SubmissionRow[],
): Map<string, { count: number; sum: number }> {
  const out = new Map<string, { count: number; sum: number }>();
  for (const s of subs) {
    const curr = out.get(s.examId);
    if (curr) {
      curr.count += 1;
      curr.sum += s.score;
    } else {
      out.set(s.examId, { count: 1, sum: s.score });
    }
  }
  return out;
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
