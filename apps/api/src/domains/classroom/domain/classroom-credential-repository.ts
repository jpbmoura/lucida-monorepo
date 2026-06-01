import type { ClassroomCredential } from "./classroom-credential.js";

export interface ClassroomCredentialRepository {
  nextId(): string;
  /** Upsert por `teacherId` (uma credencial por professor). */
  save(credential: ClassroomCredential): Promise<void>;
  findByTeacherId(teacherId: string): Promise<ClassroomCredential | null>;
  deleteByTeacherId(teacherId: string): Promise<void>;
}
