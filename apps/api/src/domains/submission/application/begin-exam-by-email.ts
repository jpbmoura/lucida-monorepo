import { ClassId } from "@/domains/class/domain/class-id.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { Student } from "@/domains/student/domain/student.js";
import { StudentCodeExhaustedError } from "@/domains/student/domain/student-errors.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { Submission } from "../domain/submission.js";
import { ExamShareNotFoundError } from "../domain/submission-errors.js";

interface Input {
  shareId: string;
  email: string;
  name: string;
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

export type BeginExamByEmailOutput =
  | {
      status: "started";
      submissionId: string;
      student: StudentDTO;
      startedAt: Date;
      deadline: number | null;
      remainingSeconds: number | null;
    }
  | {
      status: "already_submitted";
      student: StudentDTO;
      previousSubmission: PreviousSubmissionDTO;
    };

const MAX_CODE_RETRIES = 5;

/**
 * Auto-cadastro do aluno via email + nome (sem código). Se o aluno já
 * existe na turma (match por email), reusa o cadastro e segue o fluxo
 * normal de begin (resume in_progress / already_submitted / nova
 * submission). Caso contrário, cria o Student na hora com `code` e
 * `matricula` auto-gerados e prossegue.
 *
 * Colisão do `code` auto-gerado é tratada com retry — `Student.selfRegister`
 * é chamado de novo e gera novo código. Após N tentativas, falha duro.
 */
export class BeginExamByEmailUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<BeginExamByEmailOutput> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    let student = await this.students.findByClassIdAndEmail(exam.classId, email);
    if (!student) {
      student = await this.createStudentForClass({
        classId: exam.classId,
        ownerId: exam.ownerId,
        email,
        name,
      });
    }

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

  private async createStudentForClass(input: {
    classId: string;
    ownerId: string;
    email: string;
    name: string;
  }): Promise<Student> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    const organizationId = cls?.organizationId ?? null;

    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const student = Student.selfRegister({
        id: this.students.nextId(),
        classId: input.classId,
        ownerId: input.ownerId,
        organizationId,
        email: input.email,
        name: input.name,
      });
      try {
        await this.students.save(student);
        return student;
      } catch (err) {
        if (!isCodeCollision(err)) throw err;
      }
    }
    throw new StudentCodeExhaustedError();
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

/**
 * Detecta colisão de unique index no Mongo — usamos só pra discriminar
 * colisão de `code` (a única que pode ocorrer no auto-cadastro: email
 * já foi consultado antes do save, e matricula auto-gerada usa UUID).
 */
function isCodeCollision(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === 11000 || code === 11001;
}
