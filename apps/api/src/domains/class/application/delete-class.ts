import { ClassId } from "../domain/class-id.js";
import { ClassNotFoundError } from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";

interface Input {
  classId: string;
  ownerId: string;
}

export class DeleteClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    // Cascata completa — remove alunos e provas da turma antes.
    await Promise.all([
      this.students.deleteByClassId(cls.id.toString()),
      this.exams.deleteByClassId(cls.id.toString()),
    ]);
    await this.classes.delete(cls.id);
  }
}
