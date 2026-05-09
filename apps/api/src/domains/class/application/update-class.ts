import mongoose from "mongoose";
import { ClassId } from "../domain/class-id.js";
import {
  ClassCourseInvalidError,
  ClassNotFoundError,
} from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";
import { CourseId } from "@/domains/course/domain/course-id.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";

interface Input {
  classId: string;
  ownerId: string;
  name?: string;
  description?: string;
  /**
   * Quando presente e diferente do atual, move a turma pro novo curso e
   * propaga o snapshot em student/exam/submission (em transação Mongo).
   */
  courseId?: string;
}

export class UpdateClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly courses: CourseRepository,
    private readonly students: StudentRepository,
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const now = new Date();

    if (input.name !== undefined) cls.rename(input.name, now);
    if (input.description !== undefined) {
      cls.updateDescription(input.description, now);
    }

    const movingCourse =
      input.courseId !== undefined && input.courseId !== cls.courseId;

    if (movingCourse) {
      // Curso destino precisa pertencer ao mesmo dono.
      const targetCourse = await this.courses.findById(
        CourseId.of(input.courseId!),
      );
      if (!targetCourse || !targetCourse.isOwnedBy(input.ownerId)) {
        throw new ClassCourseInvalidError();
      }
      cls.moveToCourse(targetCourse.id.toString(), now);

      // Propagação atômica: a turma e os snapshots em student/exam/submission
      // precisam refletir o mesmo curso em qualquer leitura. Replica set é
      // requisito da app — billing já depende dele.
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await this.classes.save(cls);
          await Promise.all([
            this.students.updateCourseForClass(
              cls.id.toString(),
              targetCourse.id.toString(),
            ),
            this.exams.updateCourseForClass(
              cls.id.toString(),
              targetCourse.id.toString(),
            ),
            this.submissions.updateCourseForClass(
              cls.id.toString(),
              targetCourse.id.toString(),
            ),
          ]);
        });
      } finally {
        await session.endSession();
      }
      return;
    }

    await this.classes.save(cls);
  }
}
