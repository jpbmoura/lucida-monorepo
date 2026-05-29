import mongoose, { Schema, type Model } from "mongoose";

export interface BnccSkillDoc {
  code: string;
  description: string;
}

export interface LessonPlanContentDoc {
  objectives: string[];
  bnccSkills: BnccSkillDoc[];
  bnccVerified: boolean;
  content: string;
  methodology: string;
  resources: string[];
  introduction: string;
  development: string;
  conclusion: string;
  assessment: string;
  bibliography: string[];
}

export interface LessonPlanIdentificationDoc {
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  date: Date | null;
}

export interface LessonPlanUsageDoc {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface LessonPlanDoc {
  _id: string;
  classId: string;
  courseId: string;
  ownerId: string;
  organizationId: string | null;
  segment: "FUNDAMENTAL" | "MEDIO" | "FACULDADE" | "INFOPRODUTOR";
  status: "DRAFT" | "READY" | "ARCHIVED";
  identification: LessonPlanIdentificationDoc;
  content: LessonPlanContentDoc;
  sourceMaterialIds: string[];
  generatedExamId: string | null;
  generatedMaterialId: string | null;
  usage: LessonPlanUsageDoc | null;
  createdAt: Date;
  updatedAt: Date;
}

const bnccSkillSchema = new Schema<BnccSkillDoc>(
  {
    code: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const contentSchema = new Schema<LessonPlanContentDoc>(
  {
    objectives: { type: [String], default: [] },
    bnccSkills: { type: [bnccSkillSchema], default: [] },
    bnccVerified: { type: Boolean, default: false },
    content: { type: String, default: "" },
    methodology: { type: String, default: "" },
    resources: { type: [String], default: [] },
    introduction: { type: String, default: "" },
    development: { type: String, default: "" },
    conclusion: { type: String, default: "" },
    assessment: { type: String, default: "" },
    bibliography: { type: [String], default: [] },
  },
  { _id: false },
);

const identificationSchema = new Schema<LessonPlanIdentificationDoc>(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, default: "" },
    level: { type: String, default: "" },
    durationMinutes: { type: Number, default: 0 },
    date: { type: Date, default: null },
  },
  { _id: false },
);

const usageSchema = new Schema<LessonPlanUsageDoc>(
  {
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    credits: { type: Number, required: true },
  },
  { _id: false },
);

const lessonPlanSchema = new Schema<LessonPlanDoc>(
  {
    _id: { type: String, required: true },
    classId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    segment: {
      type: String,
      required: true,
      enum: ["FUNDAMENTAL", "MEDIO", "FACULDADE", "INFOPRODUTOR"],
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "READY", "ARCHIVED"],
      default: "DRAFT",
    },
    identification: { type: identificationSchema, required: true },
    content: { type: contentSchema, required: true },
    sourceMaterialIds: { type: [String], default: [] },
    generatedExamId: { type: String, default: null },
    generatedMaterialId: { type: String, default: null },
    usage: { type: usageSchema, default: null },
  },
  {
    collection: "lessonplans",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

lessonPlanSchema.index({ classId: 1, createdAt: -1 });
lessonPlanSchema.index({ ownerId: 1, createdAt: -1 });
lessonPlanSchema.index({ organizationId: 1, createdAt: -1, _id: -1 });

export const LessonPlanModel: Model<LessonPlanDoc> =
  (mongoose.models.LessonPlan as Model<LessonPlanDoc> | undefined) ??
  mongoose.model<LessonPlanDoc>("LessonPlan", lessonPlanSchema);
