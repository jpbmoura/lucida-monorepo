import mongoose, { Schema, type Model } from "mongoose";

export interface CourseDoc {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  /** Org snapshot — null pra contas individuais. */
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
  },
  {
    collection: "courses",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

courseSchema.index({ ownerId: 1, createdAt: -1 });

export const CourseModel: Model<CourseDoc> =
  (mongoose.models.Course as Model<CourseDoc> | undefined) ??
  mongoose.model<CourseDoc>("Course", courseSchema);
