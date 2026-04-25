import mongoose, { Schema, type Model } from "mongoose";

export interface StudentDoc {
  _id: string;
  classId: string;
  ownerId: string;
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
// Matrícula única por professor
studentSchema.index({ ownerId: 1, matricula: 1 }, { unique: true });

export const StudentModel: Model<StudentDoc> =
  (mongoose.models.Student as Model<StudentDoc> | undefined) ??
  mongoose.model<StudentDoc>("Student", studentSchema);
