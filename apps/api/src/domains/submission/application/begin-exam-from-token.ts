import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { StudentId } from "@/domains/student/domain/student-id.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { Submission } from "../domain/submission.js";
import {
  ExamShareNotFoundError,
  StudentCodeNotFoundError,
} from "../domain/submission-errors.js";
import {
  InvalidExamLinkTokenError,
  verifyExamLinkToken,
} from "@/shared/security/exam-link-token.js";
import type { BeginExamOutput } from "./begin-exam.js";

interface Input {
  shareId: string;
  token: string;
  authSecret: string;
}

/**
 * Variante de `BeginExamUseCase` que aceita token assinado em vez de
 * código do aluno. Gerado pela API pública via `IssueExamLinkUseCase`.
 *
 * Fluxo idêntico ao normal a partir da resolução do student — a única
 * diferença é COMO o student é encontrado:
 *   - normal: `studentCode` (7 dígitos da turma)
 *   - aqui:   `studentId` decodificado do token (após HMAC válido)
 *
 * Validações:
 *   - Token tem assinatura válida (HMAC)
 *   - shareId resolve uma prova
 *   - examId no token bate com a prova do shareId
 *   - studentId existe e pertence à turma da prova
 */
export class BeginExamFromTokenUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<BeginExamOutput> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const payload = verifyExamLinkToken(input.token, input.authSecret);

    // Cross-validation: o token foi emitido pra ESTE exam? Mesmo
    // tendo HMAC válido, um token de outra prova não vale aqui.
    if (payload.examId !== exam.id.toString()) {
      throw new InvalidExamLinkTokenError();
    }

    const student = await this.students.findById(StudentId.of(payload.studentId));
    if (!student || student.classId !== exam.classId) {
      // Reusamos `StudentCodeNotFoundError` pra não vazar a info de que
      // o student id existe mas tá em outra turma — segurança defensiva.
      throw new StudentCodeNotFoundError();
    }

    const studentDTO = {
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
