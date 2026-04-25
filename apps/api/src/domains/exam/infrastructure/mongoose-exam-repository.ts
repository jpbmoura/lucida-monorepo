import { randomUUID, randomBytes } from "node:crypto";
import { Exam } from "../domain/exam.js";
import { ExamId } from "../domain/exam-id.js";
import { Question } from "../domain/question.js";
import type { ExamRepository } from "../domain/exam-repository.js";
import { ExamModel, type ExamDoc } from "./exam-schema.js";

export class MongooseExamRepository implements ExamRepository {
  nextId(): ExamId {
    return ExamId.of(randomUUID());
  }

  nextShareId(): string {
    // 10 chars URL-safe, suficiente pra links públicos não adivinháveis.
    return randomBytes(8).toString("base64url").slice(0, 10);
  }

  async save(exam: Exam): Promise<void> {
    await ExamModel.updateOne(
      { _id: exam.id.toString() },
      {
        $set: {
          classId: exam.classId,
          ownerId: exam.ownerId,
          title: exam.title,
          description: exam.description,
          style: exam.style,
          duration: exam.duration,
          securityLevel: exam.securityLevel,
          questions: exam.questions.map((q) => q.toJSON()),
          shareId: exam.shareId,
          usage: exam.usage,
        },
        $setOnInsert: {
          _id: exam.id.toString(),
          createdAt: exam.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: ExamId): Promise<Exam | null> {
    const doc = await ExamModel.findById(id.toString()).lean<ExamDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByShareId(shareId: string): Promise<Exam | null> {
    const doc = await ExamModel.findOne({ shareId }).lean<ExamDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByClassId(classId: string): Promise<Exam[]> {
    const docs = await ExamModel.find({ classId })
      .sort({ createdAt: -1 })
      .lean<ExamDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findByOwnerId(ownerId: string): Promise<Exam[]> {
    const docs = await ExamModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean<ExamDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async countByClassId(classId: string): Promise<number> {
    return ExamModel.countDocuments({ classId }).exec();
  }

  async countActiveByClassId(classId: string): Promise<number> {
    // Enquanto não tem conceito explícito de status (live/done/draft),
    // consideramos como "ativa" qualquer prova com questões.
    return ExamModel.countDocuments({ classId, "questions.0": { $exists: true } }).exec();
  }

  async delete(id: ExamId): Promise<void> {
    await ExamModel.deleteOne({ _id: id.toString() }).exec();
  }

  async deleteByClassId(classId: string): Promise<void> {
    await ExamModel.deleteMany({ classId }).exec();
  }
}

function toEntity(doc: ExamDoc): Exam {
  return Exam.restore({
    id: ExamId.of(doc._id),
    classId: doc.classId,
    ownerId: doc.ownerId,
    title: doc.title,
    description: doc.description ?? "",
    style: doc.style,
    duration: doc.duration ?? 0,
    securityLevel: doc.securityLevel ?? "off",
    questions: (doc.questions ?? []).map((q) =>
      Question.create({
        type: q.type,
        statement: q.statement,
        context: q.context,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      }),
    ),
    shareId: doc.shareId,
    usage: doc.usage,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
