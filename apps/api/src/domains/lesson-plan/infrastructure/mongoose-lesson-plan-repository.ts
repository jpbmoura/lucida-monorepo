import { randomUUID } from "node:crypto";
import { LessonPlan } from "../domain/lesson-plan.js";
import { LessonPlanId } from "../domain/lesson-plan-id.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";
import { LessonPlanModel, type LessonPlanDoc } from "./lesson-plan-schema.js";

export class MongooseLessonPlanRepository implements LessonPlanRepository {
  nextId(): LessonPlanId {
    return LessonPlanId.of(randomUUID());
  }

  async save(plan: LessonPlan): Promise<void> {
    await LessonPlanModel.updateOne(
      { _id: plan.id.toString() },
      {
        $set: {
          classId: plan.classId,
          courseId: plan.courseId,
          ownerId: plan.ownerId,
          organizationId: plan.organizationId,
          segment: plan.segment,
          status: plan.status,
          identification: plan.identification,
          content: plan.content,
          sourceMaterialIds: plan.sourceMaterialIds,
          generatedExamId: plan.generatedExamId,
          generatedMaterialId: plan.generatedMaterialId,
          usage: plan.usage,
        },
        $setOnInsert: {
          _id: plan.id.toString(),
          createdAt: plan.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: LessonPlanId): Promise<LessonPlan | null> {
    const doc = await LessonPlanModel.findById(id.toString())
      .lean<LessonPlanDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByClassId(
    classId: string,
    options?: { includeArchived?: boolean },
  ): Promise<LessonPlan[]> {
    const filter: Record<string, unknown> = { classId };
    if (!options?.includeArchived) filter.status = { $ne: "ARCHIVED" };
    const docs = await LessonPlanModel.find(filter)
      .sort({ createdAt: -1 })
      .lean<LessonPlanDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async countActiveByClassId(classId: string): Promise<number> {
    return LessonPlanModel.countDocuments({
      classId,
      status: { $ne: "ARCHIVED" },
    }).exec();
  }

  async delete(id: LessonPlanId): Promise<void> {
    await LessonPlanModel.deleteOne({ _id: id.toString() }).exec();
  }

  async deleteByClassId(classId: string): Promise<void> {
    await LessonPlanModel.deleteMany({ classId }).exec();
  }
}

function toEntity(doc: LessonPlanDoc): LessonPlan {
  return LessonPlan.restore({
    id: LessonPlanId.of(doc._id),
    classId: doc.classId,
    courseId: doc.courseId ?? "",
    ownerId: doc.ownerId,
    organizationId: doc.organizationId ?? null,
    segment: doc.segment,
    status: doc.status ?? "DRAFT",
    identification: {
      title: doc.identification.title,
      subject: doc.identification.subject ?? "",
      level: doc.identification.level ?? "",
      durationMinutes: doc.identification.durationMinutes ?? 0,
      date: doc.identification.date ?? null,
    },
    content: {
      objectives: doc.content.objectives ?? [],
      bnccSkills: doc.content.bnccSkills ?? [],
      bnccVerified: doc.content.bnccVerified ?? false,
      content: doc.content.content ?? "",
      methodology: doc.content.methodology ?? "",
      resources: doc.content.resources ?? [],
      introduction: doc.content.introduction ?? "",
      development: doc.content.development ?? "",
      conclusion: doc.content.conclusion ?? "",
      assessment: doc.content.assessment ?? "",
      bibliography: doc.content.bibliography ?? [],
    },
    sourceMaterialIds: doc.sourceMaterialIds ?? [],
    generatedExamId: doc.generatedExamId ?? null,
    generatedMaterialId: doc.generatedMaterialId ?? null,
    usage: doc.usage ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
