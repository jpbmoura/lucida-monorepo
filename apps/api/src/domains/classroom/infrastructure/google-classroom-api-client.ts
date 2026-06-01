import type {
  ClassroomApiClient,
  ClassroomStudentSubmission,
  CreateCourseWorkInput,
  PatchGradeInput,
} from "../application/ports/classroom-api-client.js";
import type { ClassroomCourse } from "../domain/classroom-course.js";
import type { ClassroomRosterStudent } from "../domain/classroom-student.js";
import {
  ClassroomApiError,
  ClassroomReauthRequiredError,
} from "../domain/classroom-errors.js";

const BASE = "https://classroom.googleapis.com/v1";

interface RawCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  courseState: string;
  enrollmentCode?: string;
}

interface RawStudent {
  userId: string;
  profile?: {
    name?: { fullName?: string };
    emailAddress?: string;
  };
}

/**
 * Cliente REST do Google Classroom. Toda chamada usa o access token do
 * professor. FASE 1 implementa cursos + roster; createCourseWork (F2) e
 * passback (F3) ficam engatilhados (lançam erro de fase não implementada).
 */
export class GoogleClassroomApiClient implements ClassroomApiClient {
  async listActiveCourses(accessToken: string): Promise<ClassroomCourse[]> {
    const courses: ClassroomCourse[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        teacherId: "me",
        courseStates: "ACTIVE",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const data = await this.get<{
        courses?: RawCourse[];
        nextPageToken?: string;
      }>(`/courses?${params.toString()}`, accessToken);

      for (const c of data.courses ?? []) {
        courses.push({
          id: c.id,
          name: c.name,
          section: c.section ?? null,
          descriptionHeading: c.descriptionHeading ?? null,
          courseState: c.courseState,
          enrollmentCode: c.enrollmentCode ?? null,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return courses;
  }

  async listStudents(
    accessToken: string,
    classroomCourseId: string,
  ): Promise<ClassroomRosterStudent[]> {
    const students: ClassroomRosterStudent[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (pageToken) params.set("pageToken", pageToken);

      const data = await this.get<{
        students?: RawStudent[];
        nextPageToken?: string;
      }>(
        `/courses/${encodeURIComponent(classroomCourseId)}/students?${params.toString()}`,
        accessToken,
      );

      for (const s of data.students ?? []) {
        students.push({
          classroomUserId: s.userId,
          name: s.profile?.name?.fullName ?? "Aluno sem nome",
          email: s.profile?.emailAddress ?? null,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return students;
  }

  // ─── FASE 2 (engatilhado) ────────────────────────────────────────────
  async createCourseWork(
    _accessToken: string,
    _input: CreateCourseWorkInput,
  ): Promise<{ courseWorkId: string }> {
    // TODO(fase-2): POST /courses/{id}/courseWork (ALL_STUDENTS, maxPoints,
    // materials[].link → examLink). Retornar { courseWorkId: created.id }.
    throw new Error("FASE 2 — createCourseWork não implementado.");
  }

  // ─── FASE 3 (engatilhado) ────────────────────────────────────────────
  async listStudentSubmissions(
    _accessToken: string,
    _classroomCourseId: string,
    _courseWorkId: string,
  ): Promise<ClassroomStudentSubmission[]> {
    // TODO(fase-3): GET /courses/{id}/courseWork/{cw}/studentSubmissions.
    throw new Error("FASE 3 — listStudentSubmissions não implementado.");
  }

  async patchGrade(_accessToken: string, _input: PatchGradeInput): Promise<void> {
    // TODO(fase-3): PATCH draftGrade depois assignedGrade (dois passos).
    throw new Error("FASE 3 — patchGrade não implementado.");
  }

  private async get<T>(path: string, accessToken: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      // Token inválido apesar do refresh — pede reconexão.
      throw new ClassroomReauthRequiredError();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ClassroomApiError(
        `Classroom respondeu ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    return (await res.json()) as T;
  }
}
