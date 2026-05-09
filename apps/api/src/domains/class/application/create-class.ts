import { Class } from "../domain/class.js";
import { ClassCourseInvalidError } from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";
import { CourseId } from "@/domains/course/domain/course-id.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";

interface Input {
  name: string;
  description?: string;
  ownerId: string;
  courseId: string;
}

interface Output {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly courses: CourseRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    // Curso precisa existir e pertencer ao mesmo dono — sem isso, professor
    // poderia anexar turma a curso de outro.
    const course = await this.courses.findById(CourseId.of(input.courseId));
    if (!course || !course.isOwnedBy(input.ownerId)) {
      throw new ClassCourseInvalidError();
    }

    const cls = Class.create({
      id: this.classes.nextId(),
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      courseId: course.id.toString(),
    });
    await this.classes.save(cls);
    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description,
      ownerId: cls.ownerId,
      courseId: cls.courseId,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    };
  }
}
