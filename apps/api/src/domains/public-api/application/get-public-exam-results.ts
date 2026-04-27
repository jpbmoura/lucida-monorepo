import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";
import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";

interface Input {
  organizationId: string;
  examId: string;
}

type StudentResult =
  | {
      status: "pending";
      studentId: string;
      name: string;
      matricula: string;
    }
  | {
      status: "completed";
      studentId: string;
      name: string;
      matricula: string;
      submissionId: string;
      score: number;
      maxScore: number;
      correctCount: number;
      questionCount: number;
      submittedAt: Date;
      endReason: "submitted" | "time_expired" | "violation" | null;
    };

interface Output {
  exam: {
    id: string;
    title: string;
    classId: string;
    questionCount: number;
    maxScore: number;
  };
  data: StudentResult[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    averageScore: number | null;
  };
}

const MAX_SCORE = 10;

/**
 * `GET /v1/public/exams/:id/results` — devolve TODOS os alunos da turma
 * da prova com status `pending` (ainda não fez) ou `completed` (já
 * entregou + nota). Útil pra dashboards de acompanhamento.
 *
 * Validação cross-org: a turma da prova precisa pertencer à org da chave
 * (404 senão — não vazamos existência cross-org).
 *
 * `endReason` é repassado quando completed pra que o cliente saiba se a
 * prova terminou normalmente, por timeout ou por violação no modo
 * estrito (decisão pedagógica do professor).
 */
export class GetPublicExamResultsUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam) throw new ExamNotFoundError();

    const cls = await this.classes.findById(ClassId.of(exam.classId));
    if (!cls || cls.organizationId !== input.organizationId) {
      throw new ExamNotFoundError();
    }

    const [students, allSubs] = await Promise.all([
      this.students.findByClassId(exam.classId),
      this.submissions.findByExamId(exam.id.toString()),
    ]);

    // Map studentId → submission completed (in_progress entra como
    // pending — ainda não terminou).
    const submittedBy = new Map<string, (typeof allSubs)[number]>();
    for (const sub of allSubs) {
      if (sub.status === "submitted") submittedBy.set(sub.studentId, sub);
    }

    const data: StudentResult[] = students.map((s) => {
      const sub = submittedBy.get(s.id.toString());
      if (!sub) {
        return {
          status: "pending",
          studentId: s.id.toString(),
          name: s.name,
          matricula: s.matricula,
        };
      }
      return {
        status: "completed",
        studentId: s.id.toString(),
        name: s.name,
        matricula: s.matricula,
        submissionId: sub.id.toString(),
        score: sub.score,
        maxScore: MAX_SCORE,
        correctCount: sub.correctCount,
        questionCount: sub.questionCount,
        submittedAt: sub.submittedAt ?? new Date(),
        endReason: sub.endReason as
          | "submitted"
          | "time_expired"
          | "violation"
          | null,
      };
    });

    const completed = data.filter((d) => d.status === "completed");
    const averageScore =
      completed.length === 0
        ? null
        : Math.round(
            (completed.reduce(
              (sum, d) => sum + (d.status === "completed" ? d.score : 0),
              0,
            ) /
              completed.length) *
              100,
          ) / 100;

    return {
      exam: {
        id: exam.id.toString(),
        title: exam.title,
        classId: exam.classId,
        questionCount: exam.questions.length,
        maxScore: MAX_SCORE,
      },
      data,
      summary: {
        total: data.length,
        completed: completed.length,
        pending: data.length - completed.length,
        averageScore,
      },
    };
  }
}
