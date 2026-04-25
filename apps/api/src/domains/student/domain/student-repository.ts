import type { Student } from "./student.js";
import type { StudentId } from "./student-id.js";
import type { StudentCode } from "./student-code.js";

export interface StudentRepository {
  nextId(): StudentId;
  save(student: Student): Promise<void>;
  findById(id: StudentId): Promise<Student | null>;
  findByClassId(classId: string): Promise<Student[]>;
  countByClassId(classId: string): Promise<number>;
  delete(id: StudentId): Promise<void>;
  deleteByClassId(classId: string): Promise<void>;
  existsByClassAndCode(classId: string, code: StudentCode): Promise<boolean>;
  existsByOwnerAndMatricula(ownerId: string, matricula: string): Promise<boolean>;
  existsByOwnerAndMatriculaExcluding(
    ownerId: string,
    matricula: string,
    excludeId: StudentId,
  ): Promise<boolean>;
}
