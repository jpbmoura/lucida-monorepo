import mongoose, { Schema, type Model } from "mongoose";

export interface QuestionDoc {
  type: "multipleChoice" | "trueFalse";
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "fácil" | "médio" | "difícil";
}

export interface ExamUsageDoc {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface ExamDoc {
  _id: string;
  classId: string;
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

const questionSchema = new Schema<QuestionDoc>(
  {
    type: { type: String, required: true, enum: ["multipleChoice", "trueFalse"] },
    statement: { type: String, required: true },
    context: { type: String, default: null },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
    explanation: { type: String, default: "" },
    difficulty: { type: String, required: true, enum: ["fácil", "médio", "difícil"] },
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
examSchema.index({ shareId: 1 }, { unique: true });

export const ExamModel: Model<ExamDoc> =
  (mongoose.models.Exam as Model<ExamDoc> | undefined) ??
  mongoose.model<ExamDoc>("Exam", examSchema);
