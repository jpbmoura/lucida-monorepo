import { ExamId } from "../domain/exam-id.js";
import { ExamNotFoundError } from "../domain/exam-errors.js";
import type { ExamRepository } from "../domain/exam-repository.js";

interface Input {
  examId: string;
  ownerId: string;
}

export class DeleteExamUseCase {
  constructor(private readonly exams: ExamRepository) {}

  async execute(input: Input): Promise<void> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();
    await this.exams.delete(exam.id);
  }
}
