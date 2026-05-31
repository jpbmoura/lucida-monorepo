import { ExamId } from "../domain/exam-id.js";
import { ExamNotFoundError } from "../domain/exam-errors.js";
import { Question, type QuestionDifficulty, type QuestionType } from "../domain/question.js";
import type { RubricData } from "../domain/rubric.js";
import type { SecurityLevel } from "../domain/exam.js";
import type { ExamRepository } from "../domain/exam-repository.js";

interface Input {
  examId: string;
  ownerId: string;
  title?: string;
  description?: string;
  duration?: number;
  securityLevel?: SecurityLevel;
  questions?: Array<{
    type: QuestionType;
    statement: string;
    context?: string | null;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
    difficulty: QuestionDifficulty;
    rubric?: RubricData | null;
    referenceAnswer?: string | null;
  }>;
}

export class UpdateExamUseCase {
  constructor(private readonly exams: ExamRepository) {}

  async execute(input: Input): Promise<void> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();

    const now = new Date();
    if (input.title !== undefined) exam.rename(input.title, now);
    if (input.description !== undefined) exam.updateDescription(input.description, now);
    if (input.duration !== undefined) exam.updateDuration(input.duration, now);
    if (input.securityLevel !== undefined) {
      exam.updateSecurityLevel(input.securityLevel, now);
    }
    if (input.questions !== undefined) {
      const questions = input.questions.map((q) =>
        Question.create({
          type: q.type,
          statement: q.statement,
          context: q.context ?? null,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? "",
          difficulty: q.difficulty,
          rubric: q.rubric ?? null,
          referenceAnswer: q.referenceAnswer ?? null,
        }),
      );
      exam.replaceQuestions(questions, now);
    }

    await this.exams.save(exam);
  }
}
