import mongoose, { Schema, type Model } from "mongoose";

export interface TeacherAssistantDoc {
  _id: string;
  teacherUserId: string;
  assistantUserId: string;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

const teacherAssistantSchema = new Schema<TeacherAssistantDoc>(
  {
    _id: { type: String, required: true },
    teacherUserId: { type: String, required: true },
    assistantUserId: { type: String, required: true },
    organizationId: { type: String, required: true },
    createdBy: { type: String, required: true },
    revokedAt: { type: Date, default: null },
  },
  {
    collection: "teacher_assistants",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Lookup do middleware (auxiliar logando).
teacherAssistantSchema.index({ assistantUserId: 1, revokedAt: 1 });

// Lookup da UI do Analytics (lista de auxiliares de um professor).
teacherAssistantSchema.index({
  teacherUserId: 1,
  organizationId: 1,
  revokedAt: 1,
});

// Defesa: dois vínculos ativos pro mesmo par viraria bug. Index parcial
// (revokedAt: null) garante uniqueness só em vínculos vivos — links
// revogados podem coexistir com um novo ativo do mesmo par.
teacherAssistantSchema.index(
  { teacherUserId: 1, assistantUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { revokedAt: null },
    name: "uniq_active_link",
  },
);

export const TeacherAssistantModel: Model<TeacherAssistantDoc> =
  (mongoose.models.TeacherAssistant as
    | Model<TeacherAssistantDoc>
    | undefined) ??
  mongoose.model<TeacherAssistantDoc>(
    "TeacherAssistant",
    teacherAssistantSchema,
  );
