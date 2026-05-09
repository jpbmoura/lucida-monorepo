import { Course } from "../domain/course.js";
import type { CourseRepository } from "../domain/course-repository.js";

interface Input {
  name: string;
  description?: string;
  ownerId: string;
}

interface Output {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateCourseUseCase {
  constructor(private readonly courses: CourseRepository) {}

  async execute(input: Input): Promise<Output> {
    const course = Course.create({
      id: this.courses.nextId(),
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
    });
    await this.courses.save(course);
    return {
      id: course.id.toString(),
      name: course.name,
      description: course.description,
      ownerId: course.ownerId,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
