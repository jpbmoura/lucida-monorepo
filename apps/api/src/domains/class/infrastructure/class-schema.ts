import mongoose, { Schema, type Model } from "mongoose";

export interface ClassDoc {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<ClassDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    ownerId: { type: String, required: true, index: true },
  },
  {
    collection: "classes",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

classSchema.index({ ownerId: 1, createdAt: -1 });

export const ClassModel: Model<ClassDoc> =
  (mongoose.models.Class as Model<ClassDoc> | undefined) ??
  mongoose.model<ClassDoc>("Class", classSchema);
