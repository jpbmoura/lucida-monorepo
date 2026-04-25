import { randomUUID } from "node:crypto";
import { Submission } from "../domain/submission.js";
import { SubmissionId } from "../domain/submission-id.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionModel, type SubmissionDoc } from "./submission-schema.js";

export class MongooseSubmissionRepository implements SubmissionRepository {
  nextId(): SubmissionId {
    return SubmissionId.of(randomUUID());
  }

  async save(submission: Submission): Promise<void> {
    await SubmissionModel.updateOne(
      { _id: submission.id.toString() },
      {
        $set: {
          examId: submission.examId,
          classId: submission.classId,
          ownerId: submission.ownerId,
          studentId: submission.studentId,
          studentCode: submission.studentCode,
          studentName: submission.studentName,
          source: submission.source,
          status: submission.status,
          answers: submission.answers,
          correctCount: submission.correctCount,
          questionCount: submission.questionCount,
          score: submission.score,
          startedAt: submission.startedAt,
          submittedAt: submission.submittedAt,
          endReason: submission.endReason,
          integrityFlags: submission.integrityFlags,
        },
        $setOnInsert: {
          _id: submission.id.toString(),
        },
      },
      { upsert: true },
    );
  }

  async findById(id: SubmissionId): Promise<Submission | null> {
    const doc = await SubmissionModel.findById(id.toString())
      .lean<SubmissionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByExamAndStudent(
    examId: string,
    studentId: string,
  ): Promise<Submission | null> {
    const doc = await SubmissionModel.findOne({ examId, studentId })
      .lean<SubmissionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByExamId(examId: string): Promise<Submission[]> {
    const docs = await SubmissionModel.find({ examId })
      .sort({ submittedAt: -1 })
      .lean<SubmissionDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async countByExamId(examId: string): Promise<number> {
    return SubmissionModel.countDocuments({ examId }).exec();
  }

  async statsByExamIds(
    examIds: string[],
  ): Promise<Map<string, { submissionsCount: number; averageScore: number }>> {
    if (examIds.length === 0) return new Map();
    const rows = await SubmissionModel.aggregate<{
      _id: string;
      submissionsCount: number;
      averageScore: number;
    }>([
      { $match: { examId: { $in: examIds }, status: "submitted" } },
      {
        $group: {
          _id: "$examId",
          submissionsCount: { $sum: 1 },
          averageScore: { $avg: "$score" },
        },
      },
    ]).exec();
    return new Map(
      rows.map((r) => [
        r._id,
        {
          submissionsCount: r.submissionsCount,
          averageScore: Math.round(r.averageScore * 10) / 10,
        },
      ]),
    );
  }
}

function toEntity(doc: SubmissionDoc): Submission {
  return Submission.restore({
    id: SubmissionId.of(doc._id),
    examId: doc.examId,
    classId: doc.classId,
    ownerId: doc.ownerId,
    studentId: doc.studentId,
    studentCode: doc.studentCode,
    studentName: doc.studentName,
    source: doc.source ?? "online",
    status: doc.status,
    answers: doc.answers,
    correctCount: doc.correctCount,
    questionCount: doc.questionCount,
    score: doc.score,
    startedAt: doc.startedAt,
    submittedAt: doc.submittedAt,
    endReason: doc.endReason,
    integrityFlags: doc.integrityFlags ?? {
      tabSwitches: 0,
      focusLosses: 0,
      copyAttempts: 0,
      rightClickAttempts: 0,
      violationCount: 0,
    },
  });
}
