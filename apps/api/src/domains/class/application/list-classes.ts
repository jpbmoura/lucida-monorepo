import type { ClassRepository } from "../domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";

interface Input {
  ownerId: string;
}

export interface ListClassesItem {
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

export class ListClassesUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<ListClassesItem[]> {
    const classes = await this.classes.findByOwner(input.ownerId);

    const withCounts = await Promise.all(
      classes.map(async (cls) => {
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
      }),
    );

    return withCounts;
  }
}
