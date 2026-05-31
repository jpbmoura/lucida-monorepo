import mongoose, { Schema, type Model } from "mongoose";

export interface RubricLevelDoc {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface RubricCriterionDoc {
  id: string;
  name: string;
  description: string | null;
  levels: RubricLevelDoc[];
}

export interface RubricDoc {
  criteria: RubricCriterionDoc[];
}

export interface QuestionDoc {
  type: "multipleChoice" | "trueFalse" | "open";
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "fácil" | "médio" | "difícil";
  /** Só para discursivas (`type: "open"`); null nas objetivas. */
  rubric: RubricDoc | null;
  /** Resposta-modelo opcional da discursiva; null nas objetivas. */
  referenceAnswer: string | null;
}

export interface ExamUsageDoc {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface ExamDoc {
  _id: string;
  classId: string;
  /** Snapshot de `class.courseId`. Obrigatório (Fase 4+). */
  courseId: string;
  ownerId: string;
  title: string;
  description: string;
  style: "simple" | "contextual" | "analytical" | "reflective";
  duration: number;
  securityLevel: "off" | "strict";
  questions: QuestionDoc[];
  shareId: string;
  usage: ExamUsageDoc | null;
  createdAt: Date;
  updatedAt: Date;
}

const rubricLevelSchema = new Schema<RubricLevelDoc>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    points: { type: Number, required: true },
    descriptor: { type: String, default: "" },
  },
  { _id: false },
);

const rubricCriterionSchema = new Schema<RubricCriterionDoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    levels: { type: [rubricLevelSchema], default: [] },
  },
  { _id: false },
);

const rubricSchema = new Schema<RubricDoc>(
  {
    criteria: { type: [rubricCriterionSchema], default: [] },
  },
  { _id: false },
);

const questionSchema = new Schema<QuestionDoc>(
  {
    type: {
      type: String,
      required: true,
      enum: ["multipleChoice", "trueFalse", "open"],
    },
    statement: { type: String, required: true },
    context: { type: String, default: null },
    // Objetivas têm opções; discursivas salvam [].
    options: { type: [String], default: [] },
    // Índice do gabarito nas objetivas; -1 nas discursivas.
    correctAnswer: { type: Number, default: -1 },
    explanation: { type: String, default: "" },
    difficulty: { type: String, required: true, enum: ["fácil", "médio", "difícil"] },
    rubric: { type: rubricSchema, default: null },
    referenceAnswer: { type: String, default: null },
  },
  { _id: false },
);

const usageSchema = new Schema<ExamUsageDoc>(
  {
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    credits: { type: Number, required: true },
  },
  { _id: false },
);

const examSchema = new Schema<ExamDoc>(
  {
    _id: { type: String, required: true },
    classId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    style: {
      type: String,
      required: true,
      enum: ["simple", "contextual", "analytical", "reflective"],
    },
    duration: { type: Number, default: 0 },
    securityLevel: {
      type: String,
      required: true,
      enum: ["off", "strict"],
      default: "off",
    },
    questions: { type: [questionSchema], default: [] },
    shareId: { type: String, required: true },
    usage: { type: usageSchema, default: null },
  },
  {
    collection: "exams",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

examSchema.index({ classId: 1, createdAt: -1 });
examSchema.index({ courseId: 1, createdAt: -1 });
examSchema.index({ shareId: 1 }, { unique: true });

export const ExamModel: Model<ExamDoc> =
  (mongoose.models.Exam as Model<ExamDoc> | undefined) ??
  mongoose.model<ExamDoc>("Exam", examSchema);
