import { CourseId } from "../domain/course-id.js";
import {
  CourseHasClassesError,
  CourseNotFoundError,
} from "../domain/course-errors.js";
import type { CourseRepository } from "../domain/course-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

interface Input {
  courseId: string;
  ownerId: string;
}

export class DeleteCourseUseCase {
  constructor(
    private readonly courses: CourseRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const course = await this.courses.findById(CourseId.of(input.courseId));
    if (!course || !course.isOwnedBy(input.ownerId)) {
      throw new CourseNotFoundError();
    }
    // Bloqueia delete se ainda há turmas no curso. Cliente trata o 409
    // pedindo pra mover/excluir as turmas antes.
    const classCount = await this.classes.countByCourse(course.id.toString());
    if (classCount > 0) {
      throw new CourseHasClassesError(classCount);
    }
    await this.courses.delete(course.id);
  }
}
