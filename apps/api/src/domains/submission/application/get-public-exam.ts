import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import { ExamShareNotFoundError } from "../domain/submission-errors.js";

interface Input {
  shareId: string;
}

export interface PublicQuestionDTO {
  type: "multipleChoice" | "trueFalse";
  statement: string;
  context: string | null;
  options: string[];
}

export interface PublicExamDTO {
  id: string;
  shareId: string;
  classId: string;
  title: string;
  description: string;
  duration: number;
  securityLevel: "off" | "strict";
  questions: PublicQuestionDTO[];
}

// Retorna a prova sem gabarito nem explicação — só o que o aluno deve ver
// enquanto responde.
export class GetPublicExamUseCase {
  constructor(private readonly exams: ExamRepository) {}

  async execute(input: Input): Promise<PublicExamDTO> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    return {
      id: exam.id.toString(),
      shareId: exam.shareId,
      classId: exam.classId,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      securityLevel: exam.securityLevel,
      questions: exam.questions.map((q) => ({
        type: q.type,
        statement: q.statement,
        context: q.context,
        options: q.options,
      })),
    };
  }
}
