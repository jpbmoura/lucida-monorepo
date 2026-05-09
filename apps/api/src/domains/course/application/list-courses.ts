import type { CourseRepository } from "../domain/course-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

interface Input {
  ownerId: string;
}

export interface ListCoursesItem {
  id: string;
  name: string;
  description: string;
  classCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ListCoursesUseCase {
  constructor(
    private readonly courses: CourseRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<ListCoursesItem[]> {
    const courses = await this.courses.findByOwner(input.ownerId);

    const counts = await Promise.all(
      courses.map((c) => this.classes.countByCourse(c.id.toString())),
    );

    return courses.map((course, i) => ({
      id: course.id.toString(),
      name: course.name,
      description: course.description,
      classCount: counts[i] ?? 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));
  }
}
