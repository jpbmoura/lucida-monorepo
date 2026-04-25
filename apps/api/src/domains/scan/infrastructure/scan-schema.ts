import mongoose, { Schema, type Model } from "mongoose";

export interface ScanCorrectionDoc {
  questionNumber: number;
  originalAnswer: string | null;
  correctedAnswer: string | null;
  correctedAt: Date;
  correctedBy: string;
}

export interface ScanDoc {
  _id: string;
  examId: string;
  classId: string;
  ownerId: string;
  studentCode: string;
  studentCodeValid: boolean;
  studentCodeInvalidReason: string | null;
  studentId: string | null;
  studentName: string | null;
  answers: Array<string | null>;
  correctCount: number;
  questionCount: number;
  score: number;
  multiMarkedQuestions: number[];
  unmarkedQuestions: number[];
  imageQuality: "good" | "fair" | "poor";
  processingTimeMs: number;
  requiresReview: boolean;
  reviewReasons: string[];
  reviewStatus: "auto_approved" | "pending" | "approved" | "rejected";
  // Metadados de revisão manual (migrados do legacy; não há fluxo de escrita
  // no monorepo ainda — preservam histórico até o fluxo novo ser implementado).
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  corrections: ScanCorrectionDoc[];
  scannedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scanSchema = new Schema<ScanDoc>(
  {
    _id: { type: String, required: true },
    examId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    studentCode: { type: String, required: true },
    studentCodeValid: { type: Boolean, default: true },
    studentCodeInvalidReason: { type: String, default: null },
    studentId: { type: String, default: null, index: true },
    studentName: { type: String, default: null },
    answers: { type: [Schema.Types.Mixed], default: [] },
    correctCount: { type: Number, default: 0 },
    questionCount: { type: Number, required: true },
    score: { type: Number, default: 0 },
    multiMarkedQuestions: { type: [Number], default: [] },
    unmarkedQuestions: { type: [Number], default: [] },
    imageQuality: {
      type: String,
      enum: ["good", "fair", "poor"],
      default: "good",
    },
    processingTimeMs: { type: Number, default: 0 },
    requiresReview: { type: Boolean, default: false },
    reviewReasons: { type: [String], default: [] },
    reviewStatus: {
      type: String,
      enum: ["auto_approved", "pending", "approved", "rejected"],
      required: true,
    },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: null },
    corrections: {
      type: [
        new Schema<ScanCorrectionDoc>(
          {
            questionNumber: { type: Number, required: true },
            originalAnswer: { type: String, default: null },
            correctedAnswer: { type: String, default: null },
            correctedAt: { type: Date, required: true },
            correctedBy: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    scannedAt: { type: Date, required: true },
  },
  {
    collection: "scan_results",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

scanSchema.index({ examId: 1, scannedAt: -1 });

export const ScanModel: Model<ScanDoc> =
  (mongoose.models.Scan as Model<ScanDoc> | undefined) ??
  mongoose.model<ScanDoc>("Scan", scanSchema);
