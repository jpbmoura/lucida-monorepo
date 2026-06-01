import type {
  ClassroomApiClient,
  ClassroomStudentSubmission,
} from "../application/ports/classroom-api-client.js";
import type { ClassroomCourse } from "../domain/classroom-course.js";
import type { ClassroomRosterStudent } from "../domain/classroom-student.js";
import { ClassroomNotConfiguredError } from "../domain/classroom-errors.js";

/** Stub da API REST quando a integração não está configurada (503). */
export class UnavailableClassroomApiClient implements ClassroomApiClient {
  async listActiveCourses(): Promise<ClassroomCourse[]> {
    throw new ClassroomNotConfiguredError();
  }
  async listStudents(): Promise<ClassroomRosterStudent[]> {
    throw new ClassroomNotConfiguredError();
  }
  async createCourseWork(): Promise<{ courseWorkId: string }> {
    throw new ClassroomNotConfiguredError();
  }
  async listStudentSubmissions(): Promise<ClassroomStudentSubmission[]> {
    throw new ClassroomNotConfiguredError();
  }
  async patchGrade(): Promise<void> {
    throw new ClassroomNotConfiguredError();
  }
}
