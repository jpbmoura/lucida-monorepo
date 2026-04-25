import { StudentId } from "../domain/student-id.js";
import { StudentNotFoundError } from "../domain/student-errors.js";
import type { StudentRepository } from "../domain/student-repository.js";

interface Input {
  studentId: string;
  ownerId: string;
}

export class DeleteStudentUseCase {
  constructor(private readonly students: StudentRepository) {}

  async execute(input: Input): Promise<void> {
    const id = StudentId.of(input.studentId);
    const student = await this.students.findById(id);
    if (!student || !student.isOwnedBy(input.ownerId)) {
      throw new StudentNotFoundError();
    }
    await this.students.delete(id);
  }
}
