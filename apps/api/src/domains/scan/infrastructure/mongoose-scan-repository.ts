import { randomUUID } from "node:crypto";
import type { ScanRepository } from "../domain/scan-repository.js";
import { ScanId } from "../domain/scan-id.js";
import { ScanResult } from "../domain/scan-result.js";
import { ScanModel, type ScanDoc } from "./scan-schema.js";

export class MongooseScanRepository implements ScanRepository {
  nextId(): ScanId {
    return ScanId.of(randomUUID());
  }

  async save(scan: ScanResult): Promise<void> {
    await ScanModel.updateOne(
      { _id: scan.id.toString() },
      {
        $set: {
          examId: scan.examId,
          classId: scan.classId,
          ownerId: scan.ownerId,
          studentCode: scan.studentCode,
          studentCodeValid: scan.studentCodeValid,
          studentCodeInvalidReason: scan.studentCodeInvalidReason,
          studentId: scan.studentId,
          studentName: scan.studentName,
          answers: scan.answers,
          correctCount: scan.correctCount,
          questionCount: scan.questionCount,
          score: scan.score,
          multiMarkedQuestions: scan.multiMarkedQuestions,
          unmarkedQuestions: scan.unmarkedQuestions,
          imageQuality: scan.imageQuality,
          processingTimeMs: scan.processingTimeMs,
          requiresReview: scan.requiresReview,
          reviewReasons: scan.reviewReasons,
          reviewStatus: scan.reviewStatus,
          scannedAt: scan.scannedAt,
        },
        $setOnInsert: { _id: scan.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: ScanId): Promise<ScanResult | null> {
    const doc = await ScanModel.findById(id.toString()).lean<ScanDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByExamId(examId: string): Promise<ScanResult[]> {
    const docs = await ScanModel.find({ examId })
      .sort({ scannedAt: -1 })
      .lean<ScanDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: ScanId): Promise<void> {
    await ScanModel.deleteOne({ _id: id.toString() }).exec();
  }
}

function toEntity(doc: ScanDoc): ScanResult {
  return ScanResult.restore({
    id: ScanId.of(doc._id),
    examId: doc.examId,
    classId: doc.classId,
    ownerId: doc.ownerId,
    studentCode: doc.studentCode,
    studentCodeValid: doc.studentCodeValid,
    studentCodeInvalidReason: doc.studentCodeInvalidReason,
    studentId: doc.studentId,
    studentName: doc.studentName,
    answers: doc.answers,
    correctCount: doc.correctCount,
    questionCount: doc.questionCount,
    score: doc.score,
    multiMarkedQuestions: doc.multiMarkedQuestions,
    unmarkedQuestions: doc.unmarkedQuestions,
    imageQuality: doc.imageQuality,
    processingTimeMs: doc.processingTimeMs,
    requiresReview: doc.requiresReview,
    reviewReasons: doc.reviewReasons,
    reviewStatus: doc.reviewStatus,
    scannedAt: doc.scannedAt,
  });
}
