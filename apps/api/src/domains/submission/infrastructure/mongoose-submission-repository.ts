import { randomUUID } from "node:crypto";
import { Submission } from "../domain/submission.js";
import { SubmissionId } from "../domain/submission-id.js";
import { OpenGrade } from "../domain/open-grade.js";
import type {
  PendingGradingRow,
  SubmissionRepository,
} from "../domain/submission-repository.js";
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
          courseId: submission.courseId,
          ownerId: submission.ownerId,
          studentId: submission.studentId,
          studentCode: submission.studentCode,
          studentName: submission.studentName,
          source: submission.source,
          status: submission.status,
          answers: submission.answers,
          textAnswers: submission.textAnswers,
          correctCount: submission.correctCount,
          questionCount: submission.questionCount,
          score: submission.score,
          startedAt: submission.startedAt,
          submittedAt: submission.submittedAt,
          endReason: submission.endReason,
          integrityFlags: submission.integrityFlags,
          openQuestionIndices: submission.openQuestionIndices,
          openGrades: submission.openGrades.map((g) => g.toJSON()),
          gradingStatus: submission.gradingStatus,
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

  async countPendingGradingByOwner(ownerId: string): Promise<number> {
    return SubmissionModel.countDocuments({
      ownerId,
      status: "submitted",
      gradingStatus: { $in: ["pending", "partially_graded"] },
    }).exec();
  }

  async findPendingGradingByOwner(
    ownerId: string,
  ): Promise<PendingGradingRow[]> {
    const docs = await SubmissionModel.find({
      ownerId,
      status: "submitted",
      gradingStatus: { $in: ["pending", "partially_graded"] },
    })
      .sort({ submittedAt: -1 })
      .select(
        "examId classId courseId studentName studentCode score submittedAt gradingStatus openGrades.status",
      )
      .lean<
        Pick<
          SubmissionDoc,
          | "_id"
          | "examId"
          | "classId"
          | "courseId"
          | "studentName"
          | "studentCode"
          | "score"
          | "submittedAt"
          | "gradingStatus"
          | "openGrades"
        >[]
      >()
      .exec();

    return docs.map((d) => ({
      submissionId: d._id,
      examId: d.examId,
      classId: d.classId,
      courseId: d.courseId ?? "",
      studentName: d.studentName,
      studentCode: d.studentCode,
      score: d.score,
      submittedAt: d.submittedAt ?? new Date(0),
      gradingStatus: d.gradingStatus ?? "pending",
      hasAiDraft: (d.openGrades ?? []).some((g) => g.status === "ai_suggested"),
    }));
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

  async updateCourseForClass(
    classId: string,
    newCourseId: string | null,
  ): Promise<void> {
    await SubmissionModel.updateMany(
      { classId },
      { $set: { courseId: newCourseId } },
    ).exec();
  }
}

function toEntity(doc: SubmissionDoc): Submission {
  return Submission.restore({
    id: SubmissionId.of(doc._id),
    examId: doc.examId,
    classId: doc.classId,
    courseId: doc.courseId ?? "",
    ownerId: doc.ownerId,
    studentId: doc.studentId,
    studentCode: doc.studentCode,
    studentName: doc.studentName,
    source: doc.source ?? "online",
    status: doc.status,
    answers: doc.answers,
    textAnswers: doc.textAnswers ?? [],
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
    openQuestionIndices: doc.openQuestionIndices ?? [],
    openGrades: (doc.openGrades ?? []).map((g) =>
      OpenGrade.create({
        questionIndex: g.questionIndex,
        criteria: g.criteria ?? [],
        earned: g.earned,
        max: g.max,
        overriddenFraction: g.overriddenFraction ?? null,
        source: g.source,
        status: g.status,
        gradedByUserId: g.gradedByUserId ?? null,
        aiModel: g.aiModel ?? null,
        gradedAt: g.gradedAt,
      }),
    ),
    gradingStatus: doc.gradingStatus ?? "not_required",
  });
}
