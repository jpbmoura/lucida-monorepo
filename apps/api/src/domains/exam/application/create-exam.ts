import {
  Exam,
  type ExamStyle,
  type ExamUsage,
  type SecurityLevel,
} from "../domain/exam.js";
import { Question, type QuestionDifficulty, type QuestionType } from "../domain/question.js";
import type { ExamRepository } from "../domain/exam-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

export interface CreateExamInput {
  classId: string;
  ownerId: string;
  title: string;
  description?: string;
  style: ExamStyle;
  duration?: number;
  securityLevel?: SecurityLevel;
  questions: Array<{
    type: QuestionType;
    statement: string;
    context?: string | null;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    difficulty: QuestionDifficulty;
  }>;
  usage?: ExamUsage | null;
}

export interface CreateExamOutput {
  id: string;
  shareId: string;
}

export class CreateExamUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: CreateExamInput): Promise<CreateExamOutput> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }

    const questions = input.questions.map((q) =>
      Question.create({
        type: q.type,
        statement: q.statement,
        context: q.context ?? null,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? "",
        difficulty: q.difficulty,
      }),
    );

    const exam = Exam.create({
      id: this.exams.nextId(),
      classId: cls.id.toString(),
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      style: input.style,
      duration: input.duration,
      securityLevel: input.securityLevel,
      questions,
      shareId: this.exams.nextShareId(),
      usage: input.usage ?? null,
    });

    await this.exams.save(exam);
    return { id: exam.id.toString(), shareId: exam.shareId };
  }
}
