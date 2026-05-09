import mongoose, { Schema, type Model } from "mongoose";

export interface StudentDoc {
  _id: string;
  classId: string;
  ownerId: string;
  /**
   * Org à qual o aluno pertence — `null` pra contas individuais. Snapshot
   * do momento da criação. Backfill: `scripts/backfill-student-org/`.
   */
  organizationId: string | null;
  /** Snapshot de `class.courseId`. Obrigatório (Fase 4+). */
  courseId: string;
  code: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<StudentDoc>(
  {
    _id: { type: String, required: true },
    classId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    courseId: { type: String, required: true, index: true },
    code: { type: String, required: true, match: /^[0-9]{7}$/ },
    name: { type: String, required: true, trim: true },
    matricula: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
  },
  {
    collection: "students",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Código único por turma (folhas OMR)
studentSchema.index({ classId: 1, code: 1 }, { unique: true });
// Matrícula única por professor (modo "teacher" — default)
studentSchema.index({ ownerId: 1, matricula: 1 }, { unique: true });
// Matrícula única por organização (modo "organization"). Partial filter
// pra excluir docs sem org (professor individual): nulls não competem
// entre si pelo unique.
studentSchema.index(
  { organizationId: 1, matricula: 1 },
  {
    unique: true,
    partialFilterExpression: { organizationId: { $type: "string" } },
  },
);
// Email único por turma — cobre o lookup do auto-cadastro via prova
// pública. Partial filter ignora docs sem email (alunos cadastrados
// pelo professor podem não ter email), pra não competirem pelo unique.
studentSchema.index(
  { classId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  },
);

export const StudentModel: Model<StudentDoc> =
  (mongoose.models.Student as Model<StudentDoc> | undefined) ??
  mongoose.model<StudentDoc>("Student", studentSchema);
