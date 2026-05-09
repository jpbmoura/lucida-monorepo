import type { Student } from "./student.js";
import type { StudentId } from "./student-id.js";
import type { StudentCode } from "./student-code.js";

export interface StudentRepository {
  nextId(): StudentId;
  save(student: Student): Promise<void>;
  findById(id: StudentId): Promise<Student | null>;
  findByClassId(classId: string): Promise<Student[]>;
  /**
   * Busca alunos da org pela matrícula. Usado pelo flow do link de prova
   * (matrícula → studentId) quando `matriculaScope === "organization"`,
   * e pra dedup em batch nesse mesmo modo.
   */
  findByOrganizationAndMatricula(
    organizationId: string,
    matricula: string,
  ): Promise<Student | null>;
  /**
   * Busca alunos do professor pela matrícula. Usado pelo flow de link
   * quando `matriculaScope === "teacher"`.
   */
  findByOwnerAndMatricula(
    ownerId: string,
    matricula: string,
  ): Promise<Student | null>;
  /**
   * Busca aluno na turma pelo email (case-insensitive — email é
   * normalizado lowercase no domain). Usado pelo fluxo de auto-cadastro
   * via prova pública.
   */
  findByClassIdAndEmail(
    classId: string,
    email: string,
  ): Promise<Student | null>;
  countByClassId(classId: string): Promise<number>;
  /** Conta alunos do curso (via snapshot `student.courseId`). */
  countByCourseId(courseId: string): Promise<number>;
  delete(id: StudentId): Promise<void>;
  deleteByClassId(classId: string): Promise<void>;
  /**
   * Atualiza o snapshot `courseId` em todos os alunos de uma turma.
   * Usado pelo UpdateClassUseCase em Fase 4 quando a turma muda de curso.
   */
  updateCourseForClass(classId: string, newCourseId: string | null): Promise<void>;
  existsByClassAndCode(classId: string, code: StudentCode): Promise<boolean>;
  existsByOwnerAndMatricula(ownerId: string, matricula: string): Promise<boolean>;
  existsByOwnerAndMatriculaExcluding(
    ownerId: string,
    matricula: string,
    excludeId: StudentId,
  ): Promise<boolean>;
  existsByOrganizationAndMatricula(
    organizationId: string,
    matricula: string,
  ): Promise<boolean>;
  existsByOrganizationAndMatriculaExcluding(
    organizationId: string,
    matricula: string,
    excludeId: StudentId,
  ): Promise<boolean>;
}
