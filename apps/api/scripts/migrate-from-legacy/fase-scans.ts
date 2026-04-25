import {
  bumpExtra,
  coerceDate,
  coerceNumber,
  coerceString,
  legacyIdToString,
  newCounts,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyDetectedAnswer {
  questionNumber?: number;
  selectedOption?: "A" | "B" | "C" | "D" | "E" | null;
  multipleSelections?: string[];
  confidence?: number;
  isValid?: boolean;
}

interface LegacyScanResult {
  _id: unknown;
  examId?: unknown;
  classId?: unknown;
  userId?: string;
  studentId?: {
    value?: string | null;
    isValid?: boolean;
  };
  studentEmail?: string | null;
  studentRef?: unknown;
  answers?: LegacyDetectedAnswer[];
  grading?: {
    totalQuestions?: number;
    correctAnswers?: number;
    score?: number;
    questionResults?: Array<{
      questionNumber: number;
      studentAnswer: string | null;
      correctAnswer: string;
      isCorrect: boolean;
    }>;
  };
  imageQuality?: "excellent" | "good" | "fair" | "poor";
  processingTimeMs?: number;
  requiresReview?: boolean;
  reviewReasons?: string[];
  multi_marked_questions?: Array<string | number>;
  unmarked_questions?: Array<string | number>;
  reviewStatus?: "pending" | "approved" | "corrected" | "rejected";
  reviewedBy?: string | null;
  reviewedAt?: unknown;
  reviewNotes?: string | null;
  corrections?: Array<{
    questionNumber: number;
    originalAnswer: string;
    correctedAnswer: string;
    correctedAt: unknown;
    correctedBy: string;
  }>;
  scannedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Migra ScanResult legacy → scan_results. Faz tradução de shape (studentId
 * objeto → studentCode string), mapeia `reviewStatus: "corrected"` → "approved"
 * (não existe no monorepo), e reusa o studentRef legacy como studentId quando
 * disponível.
 */
export async function runScansPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.scans = counts;

  const legacyCol = ctx.sourceDb.collection<LegacyScanResult>(LEGACY.scanresults);
  const targetCol = ctx.targetDb.collection("scan_results");

  const query = ctx.userFilter
    ? { userId: { $in: Array.from(ctx.userFilter) } }
    : {};

  const cursor = legacyCol.find(query);
  const limited = ctx.limit != null ? cursor.limit(ctx.limit) : cursor;

  for await (const legacy of limited) {
    counts.processed++;
    const legacyId = legacyIdToString(legacy._id);
    const clerkId = coerceString(legacy.userId);

    try {
      const ownerId = ctx.userMap.get(clerkId);
      if (!ownerId) {
        counts.skipped++;
        ctx.logger({
          entity: "scan",
          status: "skip",
          legacyId,
          reason: `owner not in user map (clerkId=${clerkId})`,
        });
        continue;
      }

      const examId = legacyIdToString(legacy.examId);
      const classId = legacyIdToString(legacy.classId);

      const questionCount = coerceNumber(legacy.grading?.totalQuestions, 0);
      const correctCount = coerceNumber(legacy.grading?.correctAnswers, 0);
      const score = coerceNumber(legacy.grading?.score, 0);

      const studentCode = coerceString(legacy.studentId?.value);
      const studentCodeValid = Boolean(legacy.studentId?.isValid);

      const answers = translateAnswers(legacy.answers, questionCount);

      const reviewStatus = mapReviewStatus(legacy.reviewStatus);
      if (legacy.reviewStatus === "corrected") {
        bumpExtra(counts, "review-corrected-remapped");
      }

      const imageQuality = legacy.imageQuality === "excellent" ? "good" : legacy.imageQuality ?? "good";

      const scannedAt = coerceDate(legacy.scannedAt);
      const createdAt = coerceDate(legacy.createdAt, scannedAt);
      const updatedAt = coerceDate(legacy.updatedAt, createdAt);

      const doc = {
        _id: legacyId,
        examId,
        classId,
        ownerId,
        studentCode,
        studentCodeValid,
        studentCodeInvalidReason: studentCodeValid ? null : "invalid-on-scan",
        studentId: legacy.studentRef ? legacyIdToString(legacy.studentRef) : null,
        studentName: null,
        answers,
        correctCount,
        questionCount,
        score,
        multiMarkedQuestions: toNumberArray(legacy.multi_marked_questions),
        unmarkedQuestions: toNumberArray(legacy.unmarked_questions),
        imageQuality,
        processingTimeMs: coerceNumber(legacy.processingTimeMs, 0),
        requiresReview: Boolean(legacy.requiresReview),
        reviewReasons: Array.isArray(legacy.reviewReasons)
          ? legacy.reviewReasons
          : [],
        reviewStatus,
        reviewedBy: legacy.reviewedBy ?? null,
        reviewedAt: legacy.reviewedAt
          ? coerceDate(legacy.reviewedAt)
          : null,
        reviewNotes: legacy.reviewNotes ?? null,
        corrections: Array.isArray(legacy.corrections)
          ? legacy.corrections.map((c) => ({
              questionNumber: c.questionNumber,
              originalAnswer: c.originalAnswer ?? null,
              correctedAnswer: c.correctedAnswer ?? null,
              correctedAt: coerceDate(c.correctedAt),
              correctedBy: c.correctedBy,
            }))
          : [],
        scannedAt,
        createdAt,
        updatedAt,
      };

      if (!ctx.dryRun) {
        await targetCol.updateOne(
          { _id: legacyId as unknown as never },
          { $set: doc },
          { upsert: true },
        );
      }

      counts.ok++;
      ctx.logger({ entity: "scan", status: "ok", legacyId, newId: legacyId });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "scan",
        status: "error",
        legacyId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function translateAnswers(
  raw: LegacyDetectedAnswer[] | undefined,
  questionCount: number,
): Array<string | null> {
  const size = Math.max(questionCount, raw?.length ?? 0);
  const out: Array<string | null> = new Array(size).fill(null);
  if (!raw) return out;
  for (const a of raw) {
    const n = a.questionNumber;
    if (typeof n !== "number" || n < 1) continue;
    const idx = n - 1;
    if (idx >= out.length) continue;
    out[idx] = a.selectedOption ?? null;
  }
  return out;
}

function toNumberArray(raw: Array<string | number> | undefined): number[] {
  if (!raw) return [];
  return raw
    .map((v) => (typeof v === "number" ? v : parseInt(String(v), 10)))
    .filter((n) => Number.isFinite(n));
}

function mapReviewStatus(
  raw: LegacyScanResult["reviewStatus"],
): "auto_approved" | "pending" | "approved" | "rejected" {
  switch (raw) {
    case "approved":
    case "corrected":
      return "approved";
    case "rejected":
      return "rejected";
    case "pending":
      return "pending";
    default:
      return "auto_approved";
  }
}
