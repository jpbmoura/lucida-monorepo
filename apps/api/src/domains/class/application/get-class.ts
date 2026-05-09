import { ClassId } from "../domain/class-id.js";
import { ClassNotFoundError } from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";
import { CourseId } from "@/domains/course/domain/course-id.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
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
  courseId: string;
  /**
   * Nome do curso pai. Hidratado pra evitar round-trip no frontend (ex.:
   * link "voltar pro curso" no detalhe da turma). `null` se o curso foi
   * removido (defensivo — não deveria acontecer com bloqueio de delete).
   */
  courseName: string | null;
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
    private readonly courses: CourseRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<GetClassOutput> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const [studentsCount, examsCount, activeExamsCount, course] =
      await Promise.all([
        this.students.countByClassId(cls.id.toString()),
        this.exams.countByClassId(cls.id.toString()),
        this.exams.countActiveByClassId(cls.id.toString()),
        this.courses.findById(CourseId.of(cls.courseId)),
      ]);
    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description,
      courseId: cls.courseId,
      courseName: course?.name ?? null,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
      lastActivityAt: cls.updatedAt,
      studentsCount,
      examsCount,
      activeExamsCount,
    };
  }
}
