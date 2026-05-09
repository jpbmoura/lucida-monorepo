import { CourseId } from "../domain/course-id.js";
import { CourseNotFoundError } from "../domain/course-errors.js";
import type { CourseRepository } from "../domain/course-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";

interface Input {
  courseId: string;
  ownerId: string;
}

interface ClassDto {
  id: string;
  name: string;
  description: string;
  courseId: string;
  studentsCount: number;
  examsCount: number;
  activeExamsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetCourseOutput {
  id: string;
  name: string;
  description: string;
  classCount: number;
  classes: ClassDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class GetCourseUseCase {
  constructor(
    private readonly courses: CourseRepository,
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<GetCourseOutput> {
    const course = await this.courses.findById(CourseId.of(input.courseId));
    if (!course || !course.isOwnedBy(input.ownerId)) {
      throw new CourseNotFoundError();
    }
    const classes = await this.classes.findByCourse(course.id.toString());

    // Hidrata cada turma com os mesmos counts que `ListClassesUseCase`
    // expõe — UI da listagem dentro do curso depende desses campos.
    const enriched = await Promise.all(
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
          courseId: cls.courseId,
          studentsCount,
          examsCount,
          activeExamsCount,
          lastActivityAt: cls.updatedAt,
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
        };
      }),
    );

    return {
      id: course.id.toString(),
      name: course.name,
      description: course.description,
      classCount: enriched.length,
      classes: enriched,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
