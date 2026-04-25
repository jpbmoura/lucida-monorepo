import { StudentId } from "../domain/student-id.js";
import {
  DuplicateMatriculaError,
  StudentNotFoundError,
} from "../domain/student-errors.js";
import type { StudentRepository } from "../domain/student-repository.js";

interface Input {
  studentId: string;
  ownerId: string;
  name?: string;
  matricula?: string;
  email?: string | null;
}

export class UpdateStudentUseCase {
  constructor(private readonly students: StudentRepository) {}

  async execute(input: Input): Promise<void> {
    const id = StudentId.of(input.studentId);
    const student = await this.students.findById(id);
    if (!student || !student.isOwnedBy(input.ownerId)) {
      throw new StudentNotFoundError();
    }

    const now = new Date();
    if (input.matricula !== undefined && input.matricula.trim() !== student.matricula) {
      const clash = await this.students.existsByOwnerAndMatriculaExcluding(
        input.ownerId,
        input.matricula.trim(),
        id,
      );
      if (clash) throw new DuplicateMatriculaError();
      student.updateMatricula(input.matricula, now);
    }
    if (input.name !== undefined) student.rename(input.name, now);
    if (input.email !== undefined) student.updateEmail(input.email, now);

    await this.students.save(student);
  }
}
