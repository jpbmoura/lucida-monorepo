import { Student } from "../domain/student.js";
import { StudentCode } from "../domain/student-code.js";
import {
  DuplicateMatriculaError,
  StudentCodeExhaustedError,
} from "../domain/student-errors.js";
import type { StudentRepository } from "../domain/student-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

interface Input {
  classId: string;
  ownerId: string;
  name: string;
  matricula: string;
  email?: string | null;
}

interface Output {
  id: string;
  code: string;
}

const MAX_CODE_ATTEMPTS = 10;

export class CreateStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }

    if (await this.students.existsByOwnerAndMatricula(input.ownerId, input.matricula.trim())) {
      throw new DuplicateMatriculaError();
    }

    const code = await this.generateUniqueCode(cls.id.toString());
    const student = Student.create({
      id: this.students.nextId(),
      classId: cls.id.toString(),
      ownerId: input.ownerId,
      courseId: cls.courseId,
      code,
      name: input.name,
      matricula: input.matricula,
      email: input.email ?? null,
    });
    await this.students.save(student);
    return { id: student.id.toString(), code: student.code.toString() };
  }

  private async generateUniqueCode(classId: string): Promise<StudentCode> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = StudentCode.generate();
      const clash = await this.students.existsByClassAndCode(classId, candidate);
      if (!clash) return candidate;
    }
    throw new StudentCodeExhaustedError();
  }
}
