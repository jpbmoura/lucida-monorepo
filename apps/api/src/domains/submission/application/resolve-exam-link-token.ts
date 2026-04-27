import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { StudentId } from "@/domains/student/domain/student-id.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import {
  ExamShareNotFoundError,
  StudentCodeNotFoundError,
} from "../domain/submission-errors.js";
import {
  InvalidExamLinkTokenError,
  verifyExamLinkToken,
} from "@/shared/security/exam-link-token.js";

interface Input {
  shareId: string;
  token: string;
  authSecret: string;
}

interface Output {
  exam: {
    id: string;
    title: string;
  };
  student: {
    id: string;
    name: string;
  };
  /**
   * Estado atual da submissão — útil pra UI escolher entre mostrar
   * "Começar prova" vs "Você já entregou esta prova".
   */
  submission:
    | { status: "not_started" }
    | { status: "in_progress"; submissionId: string }
    | {
        status: "submitted";
        submissionId: string;
        score: number;
        questionCount: number;
        submittedAt: Date;
      };
}

/**
 * Valida um token de link de prova e retorna metadata pra UI mostrar
 * tela de boas-vindas SEM criar submissão. O `BeginExamFromTokenUseCase`
 * cuida da criação quando o aluno aperta "Começar prova".
 *
 * Justifica a rota separada: queremos exibir nome do aluno antes do
 * clique, sem efeito colateral. (Caso contrário, abrir o link contaria
 * como início da prova.)
 */
export class ResolveExamLinkTokenUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const payload = verifyExamLinkToken(input.token, input.authSecret);
    if (payload.examId !== exam.id.toString()) {
      throw new InvalidExamLinkTokenError();
    }

    const student = await this.students.findById(StudentId.of(payload.studentId));
    if (!student || student.classId !== exam.classId) {
      throw new StudentCodeNotFoundError();
    }

    const existing = await this.submissions.findByExamAndStudent(
      exam.id.toString(),
      student.id.toString(),
    );

    let submission: Output["submission"];
    if (!existing) {
      submission = { status: "not_started" };
    } else if (existing.status === "in_progress") {
      submission = {
        status: "in_progress",
        submissionId: existing.id.toString(),
      };
    } else {
      submission = {
        status: "submitted",
        submissionId: existing.id.toString(),
        score: existing.score,
        questionCount: existing.questionCount,
        submittedAt: existing.submittedAt ?? new Date(),
      };
    }

    return {
      exam: { id: exam.id.toString(), title: exam.title },
      student: { id: student.id.toString(), name: student.name },
      submission,
    };
  }
}
