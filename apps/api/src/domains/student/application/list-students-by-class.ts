import type { StudentRepository } from "../domain/student-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

interface Input {
  classId: string;
  ownerId: string;
}

export interface ListStudentsItem {
  id: string;
  code: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: Date;
}

export class ListStudentsByClassUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<ListStudentsItem[]> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const list = await this.students.findByClassId(cls.id.toString());
    return list.map((s) => ({
      id: s.id.toString(),
      code: s.code.toString(),
      name: s.name,
      matricula: s.matricula,
      email: s.email,
      createdAt: s.createdAt,
    }));
  }
}
