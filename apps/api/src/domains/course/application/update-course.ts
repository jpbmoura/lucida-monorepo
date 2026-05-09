import { CourseId } from "../domain/course-id.js";
import { CourseNotFoundError } from "../domain/course-errors.js";
import type { CourseRepository } from "../domain/course-repository.js";

interface Input {
  courseId: string;
  ownerId: string;
  name?: string;
  description?: string;
}

export class UpdateCourseUseCase {
  constructor(private readonly courses: CourseRepository) {}

  async execute(input: Input): Promise<void> {
    const course = await this.courses.findById(CourseId.of(input.courseId));
    if (!course || !course.isOwnedBy(input.ownerId)) {
      throw new CourseNotFoundError();
    }
    const now = new Date();
    if (input.name !== undefined) course.rename(input.name, now);
    if (input.description !== undefined) course.updateDescription(input.description, now);
    await this.courses.save(course);
  }
}
