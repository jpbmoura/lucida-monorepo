import type { ClassroomCourse } from "../../domain/classroom-course.js";
import type { ClassroomRosterStudent } from "../../domain/classroom-student.js";

/**
 * Porta da API REST do Google Classroom (classroom.googleapis.com).
 * Todas as chamadas usam o access token do PROFESSOR (passado por argumento)
 * — nunca uma credencial de serviço. Implementada por
 * `GoogleClassroomApiClient`; sem config, stub lança `ClassroomNotConfiguredError`.
 */
export interface ClassroomApiClient {
  // ─── FASE 1 (implementado) ───────────────────────────────────────────
  /** GET /v1/courses?teacherId=me&courseStates=ACTIVE */
  listActiveCourses(accessToken: string): Promise<ClassroomCourse[]>;
  /** GET /v1/courses/{courseId}/students (pagina internamente). */
  listStudents(
    accessToken: string,
    classroomCourseId: string,
  ): Promise<ClassroomRosterStudent[]>;

  // ─── FASE 2 (engatilhado — não implementado) ─────────────────────────
  /**
   * POST /v1/courses/{courseId}/courseWork — cria UMA atividade
   * (assigneeMode ALL_STUDENTS, maxPoints, Link material pro /exam/{shareId}).
   * Retorna o courseWorkId, que é guardado em `exam.courseWorkId`.
   * INVARIANTE: só a atividade criada aqui aceita passback de nota (FASE 3).
   */
  createCourseWork(
    accessToken: string,
    input: CreateCourseWorkInput,
  ): Promise<{ courseWorkId: string }>;

  // ─── FASE 3 (engatilhado — não implementado) ─────────────────────────
  /** GET /v1/courses/{courseId}/courseWork/{id}/studentSubmissions */
  listStudentSubmissions(
    accessToken: string,
    classroomCourseId: string,
    courseWorkId: string,
  ): Promise<ClassroomStudentSubmission[]>;
  /**
   * Lança nota em dois passos: PATCH draftGrade, depois PATCH assignedGrade.
   * Escrita com a credencial do professor.
   */
  patchGrade(
    accessToken: string,
    input: PatchGradeInput,
  ): Promise<void>;
}

export interface CreateCourseWorkInput {
  classroomCourseId: string;
  title: string;
  description: string;
  maxPoints: number;
  /** Link público da prova (/exam/{shareId}) — material genérico, não por aluno. */
  examLink: string;
}

export interface ClassroomStudentSubmission {
  submissionId: string;
  classroomUserId: string;
}

export interface PatchGradeInput {
  classroomCourseId: string;
  courseWorkId: string;
  submissionId: string;
  grade: number;
}
