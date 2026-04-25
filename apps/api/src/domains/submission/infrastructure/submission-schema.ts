import mongoose, { Schema, type Model } from "mongoose";

export interface IntegrityFlagsDoc {
  tabSwitches: number;
  focusLosses: number;
  copyAttempts: number;
  rightClickAttempts: number;
  violationCount: number;
}

export interface SubmissionDoc {
  _id: string;
  examId: string;
  classId: string;
  ownerId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  source: "online" | "scanner";
  status: "in_progress" | "submitted";
  answers: Array<number | null>;
  correctCount: number;
  questionCount: number;
  score: number;
  startedAt: Date;
  submittedAt: Date | null;
  endReason: "submitted" | "time_expired" | "violation" | "abandoned" | null;
  integrityFlags: IntegrityFlagsDoc;
  createdAt: Date;
  updatedAt: Date;
}

const integrityFlagsSchema = new Schema<IntegrityFlagsDoc>(
  {
    tabSwitches: { type: Number, default: 0 },
    focusLosses: { type: Number, default: 0 },
    copyAttempts: { type: Number, default: 0 },
    rightClickAttempts: { type: Number, default: 0 },
    violationCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const submissionSchema = new Schema<SubmissionDoc>(
  {
    _id: { type: String, required: true },
    examId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentCode: { type: String, required: true },
    studentName: { type: String, required: true, trim: true },
    source: {
      type: String,
      required: true,
      enum: ["online", "scanner"],
      default: "online",
    },
    status: {
      type: String,
      required: true,
      enum: ["in_progress", "submitted"],
      default: "in_progress",
    },
    answers: { type: [Schema.Types.Mixed], required: true },
    correctCount: { type: Number, default: 0 },
    questionCount: { type: Number, required: true },
    score: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    endReason: {
      type: String,
      enum: ["submitted", "time_expired", "violation", "abandoned"],
      default: null,
    },
    integrityFlags: { type: integrityFlagsSchema, default: () => ({}) },
  },
  {
    collection: "submissions",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Uma submissão única por (exam, student) em qualquer status — retomar sessão
// pega o mesmo doc.
submissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ examId: 1, status: 1, submittedAt: -1 });

export const SubmissionModel: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc> | undefined) ??
  mongoose.model<SubmissionDoc>("Submission", submissionSchema);
