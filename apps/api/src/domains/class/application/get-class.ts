import { ClassId } from "../domain/class-id.js";
import { ClassNotFoundError } from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";

interface Input {
  classId: string;
  ownerId: string;
}

export interface GetClassOutput {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date | null;
  studentsCount: number;
  examsCount: number;
  activeExamsCount: number;
}

export class GetClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<GetClassOutput> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const [studentsCount, examsCount, activeExamsCount] = await Promise.all([
      this.students.countByClassId(cls.id.toString()),
      this.exams.countByClassId(cls.id.toString()),
      this.exams.countActiveByClassId(cls.id.toString()),
    ]);
    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
      lastActivityAt: cls.updatedAt,
      studentsCount,
      examsCount,
      activeExamsCount,
    };
  }
}
