import mongoose, { Schema, type Model } from "mongoose";

export interface ClassDoc {
  _id: string;
  name: string;
  description: string;
  /** Disciplina principal (ex.: "Matemática"). Null pra turmas legadas. */
  subject: string | null;
  /** Série/ano (ex.: "9", "3º EM"). Null pra turmas legadas. */
  grade: string | null;
  ownerId: string;
  /** Org snapshot — null pra contas individuais. Backfill via script. */
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<ClassDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    subject: { type: String, default: null, trim: true },
    grade: { type: String, default: null, trim: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
  },
  {
    collection: "classes",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

classSchema.index({ ownerId: 1, createdAt: -1 });
// Listagem paginada por org (rotas públicas) — ordenada por createdAt desc.
// Inclui `_id` no índice pra permitir cursor com tiebreak estável.
classSchema.index({ organizationId: 1, createdAt: -1, _id: -1 });

export const ClassModel: Model<ClassDoc> =
  (mongoose.models.Class as Model<ClassDoc> | undefined) ??
  mongoose.model<ClassDoc>("Class", classSchema);
