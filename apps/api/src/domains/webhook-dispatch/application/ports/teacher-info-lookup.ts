/**
 * Port estreita pra resolver dados básicos de um professor (id → nome).
 * Usada pelo dispatcher pra enriquecer payload de `submission.completed`
 * sem acoplar o dispatcher ao adapter da BetterAuth.
 */

export interface TeacherInfo {
  id: string;
  name: string;
}

export interface TeacherInfoLookup {
  findById(userId: string): Promise<TeacherInfo | null>;
}
