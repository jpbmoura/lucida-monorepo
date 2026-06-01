import mongoose, { Schema, type Model } from "mongoose";

/**
 * Credencial OAuth do Classroom por professor. Os tokens são guardados
 * CIFRADOS (`accessTokenEnc`/`refreshTokenEnc`) — a cifra/decifra acontece no
 * repositório via `TokenCipher`. Uma credencial por `teacherId` (índice único).
 */
export interface ClassroomCredentialDoc {
  _id: string;
  teacherId: string;
  organizationId: string | null;
  googleEmail: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const classroomCredentialSchema = new Schema<ClassroomCredentialDoc>(
  {
    _id: { type: String, required: true },
    teacherId: { type: String, required: true },
    organizationId: { type: String, default: null },
    googleEmail: { type: String, required: true },
    accessTokenEnc: { type: String, required: true },
    refreshTokenEnc: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scopes: { type: [String], default: [] },
  },
  {
    collection: "classroom_credentials",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Uma credencial por professor (upsert por teacherId).
classroomCredentialSchema.index({ teacherId: 1 }, { unique: true });

export const ClassroomCredentialModel: Model<ClassroomCredentialDoc> =
  (mongoose.models.ClassroomCredential as
    | Model<ClassroomCredentialDoc>
    | undefined) ??
  mongoose.model<ClassroomCredentialDoc>(
    "ClassroomCredential",
    classroomCredentialSchema,
  );
