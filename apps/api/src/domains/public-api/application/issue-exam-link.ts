import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { GetOrganizationPreferencesUseCase } from "@/domains/organization-preferences/application/get-organization-preferences.js";
import { signExamLinkToken } from "@/shared/security/exam-link-token.js";

class StudentNotInClassError extends DomainError {
  readonly code = "STUDENT_NOT_IN_CLASS";
  readonly statusCode = 422;
  constructor() {
    super("O aluno encontrado pela matrícula não pertence à turma da prova.");
  }
}

class StudentMatriculaNotFoundError extends DomainError {
  readonly code = "MATRICULA_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super(
      "Nenhum aluno encontrado com essa matrícula no escopo configurado da organização.",
    );
  }
}

interface Input {
  organizationId: string;
  examId: string;
  matricula: string;
  /**
   * Base URL do app onde o aluno responde a prova. Vem do env do api
   * (`WEB_ORIGIN`); o controller injeta. No input pra facilitar teste.
   */
  webOrigin: string;
  authSecret: string;
}

interface Output {
  /** URL pronta pra enviar ao aluno — abre na tela com nome preenchido. */
  url: string;
  /** Token cru, caso o cliente queira montar a URL diferente. */
  token: string;
  student: {
    id: string;
    name: string;
    matricula: string;
  };
  exam: {
    id: string;
    title: string;
    shareId: string;
  };
}

/**
 * `POST /v1/public/exams/:id/share-link` — gera link assinado com
 * `studentId` resolvido a partir da `matricula`. Respeita o
 * `matriculaScope` da org (teacher → busca por owner; organization →
 * busca por org).
 *
 * Validações:
 *   - Exam existe
 *   - Exam pertence à org da chave (via class.organizationId)
 *   - Matrícula resolve um aluno (404 se não)
 *   - Aluno pertence à mesma turma do exam (422 se não)
 */
export class IssueExamLinkUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly students: StudentRepository,
    private readonly classes: ClassRepository,
    private readonly orgPrefs: GetOrganizationPreferencesUseCase,
  ) {}

  async execute(input: Input): Promise<Output> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam) throw new ExamNotFoundError();

    // Defesa em profundidade: a turma da prova precisa pertencer à org
    // da chave. Sem isso, uma chave da org X poderia gerar links pra
    // exams de orgs alheias se o examId vazasse.
    const cls = await this.classes.findById(ClassId.of(exam.classId));
    if (!cls || cls.organizationId !== input.organizationId) {
      throw new ExamNotFoundError();
    }

    const prefs = await this.orgPrefs.execute({
      organizationId: input.organizationId,
    });

    const matricula = input.matricula.trim();
    const student =
      prefs.matriculaScope === "organization"
        ? await this.students.findByOrganizationAndMatricula(
            input.organizationId,
            matricula,
          )
        : await this.students.findByOwnerAndMatricula(exam.ownerId, matricula);

    if (!student) throw new StudentMatriculaNotFoundError();

    if (student.classId !== exam.classId) {
      throw new StudentNotInClassError();
    }

    const token = signExamLinkToken(
      { examId: exam.id.toString(), studentId: student.id.toString() },
      input.authSecret,
    );

    const url = `${trimTrailingSlash(input.webOrigin)}/exam/${encodeURIComponent(
      exam.shareId,
    )}/start/${token}`;

    return {
      url,
      token,
      student: {
        id: student.id.toString(),
        name: student.name,
        matricula: student.matricula,
      },
      exam: {
        id: exam.id.toString(),
        title: exam.title,
        shareId: exam.shareId,
      },
    };
  }
}

function trimTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
