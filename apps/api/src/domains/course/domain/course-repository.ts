import type { Course } from "./course.js";
import type { CourseId } from "./course-id.js";

export interface CourseRepository {
  nextId(): CourseId;
  save(course: Course): Promise<void>;
  findById(id: CourseId): Promise<Course | null>;
  findByOwner(ownerId: string): Promise<Course[]>;
  delete(id: CourseId): Promise<void>;
}
