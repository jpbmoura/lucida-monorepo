import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { Submission } from "../domain/submission.js";
import {
  ExamShareNotFoundError,
  StudentCodeNotFoundError,
} from "../domain/submission-errors.js";

interface Input {
  shareId: string;
  studentCode: string;
}

interface StudentDTO {
  id: string;
  name: string;
  code: string;
}

interface PreviousSubmissionDTO {
  id: string;
  score: number;
  correctCount: number;
  questionCount: number;
  submittedAt: Date;
}

export type BeginExamOutput =
  | {
      status: "started";
      submissionId: string;
      student: StudentDTO;
      startedAt: Date;
      /** UNIX timestamp (ms) quando a prova fecha; null se duração=0. */
      deadline: number | null;
      /** Segundos restantes — pro cliente mostrar timer imediato. */
      remainingSeconds: number | null;
    }
  | {
      status: "already_submitted";
      student: StudentDTO;
      previousSubmission: PreviousSubmissionDTO;
    };

/**
 * Inicia (ou retoma) uma submissão em progresso.
 *
 * Comportamento:
 * - status submitted já existente → retorna "already_submitted" (sem criar nada).
 * - status in_progress já existente → retorna "started" com a MESMA startedAt.
 * - nenhuma submissão → cria nova com startedAt=now.
 *
 * Deadline é calculada do servidor (startedAt + duration) — impede
 * manipulação de timer via DevTools.
 */
export class BeginExamUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<BeginExamOutput> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const code = input.studentCode.trim();
    const turmaStudents = await this.students.findByClassId(exam.classId);
    const student = turmaStudents.find((s) => s.code.toString() === code);
    if (!student) throw new StudentCodeNotFoundError();

    const studentDTO: StudentDTO = {
      id: student.id.toString(),
      name: student.name,
      code: student.code.toString(),
    };

    const existing = await this.submissions.findByExamAndStudent(
      exam.id.toString(),
      student.id.toString(),
    );

    if (existing && existing.status === "submitted") {
      return {
        status: "already_submitted",
        student: studentDTO,
        previousSubmission: {
          id: existing.id.toString(),
          score: existing.score,
          correctCount: existing.correctCount,
          questionCount: existing.questionCount,
          submittedAt: existing.submittedAt ?? new Date(),
        },
      };
    }

    if (existing && existing.status === "in_progress") {
      // Retomada — mantém startedAt original.
      return {
        status: "started",
        submissionId: existing.id.toString(),
        student: studentDTO,
        startedAt: existing.startedAt,
        ...computeDeadline(existing.startedAt, exam.duration),
      };
    }

    const submission = Submission.start({
      id: this.submissions.nextId(),
      examId: exam.id.toString(),
      classId: exam.classId,
      ownerId: exam.ownerId,
      studentId: student.id.toString(),
      studentCode: student.code.toString(),
      studentName: student.name,
      questionCount: exam.questions.length,
    });

    await this.submissions.save(submission);

    return {
      status: "started",
      submissionId: submission.id.toString(),
      student: studentDTO,
      startedAt: submission.startedAt,
      ...computeDeadline(submission.startedAt, exam.duration),
    };
  }
}

function computeDeadline(
  startedAt: Date,
  durationMinutes: number,
): { deadline: number | null; remainingSeconds: number | null } {
  if (durationMinutes <= 0) {
    return { deadline: null, remainingSeconds: null };
  }
  const deadline = startedAt.getTime() + durationMinutes * 60_000;
  const remainingMs = deadline - Date.now();
  return {
    deadline,
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
  };
}
