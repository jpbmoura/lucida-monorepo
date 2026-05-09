import { randomUUID } from "node:crypto";
import { Course } from "../domain/course.js";
import { CourseId } from "../domain/course-id.js";
import type { CourseRepository } from "../domain/course-repository.js";
import { CourseModel, type CourseDoc } from "./course-schema.js";

export class MongooseCourseRepository implements CourseRepository {
  nextId(): CourseId {
    return CourseId.of(randomUUID());
  }

  async save(course: Course): Promise<void> {
    await CourseModel.updateOne(
      { _id: course.id.toString() },
      {
        $set: {
          name: course.name,
          description: course.description,
          ownerId: course.ownerId,
          organizationId: course.organizationId,
        },
        $setOnInsert: {
          _id: course.id.toString(),
          createdAt: course.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: CourseId): Promise<Course | null> {
    const doc = await CourseModel.findById(id.toString()).lean<CourseDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Course[]> {
    const docs = await CourseModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean<CourseDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: CourseId): Promise<void> {
    await CourseModel.deleteOne({ _id: id.toString() }).exec();
  }
}

function toEntity(doc: CourseDoc): Course {
  return Course.restore({
    id: CourseId.of(doc._id),
    name: doc.name,
    description: doc.description ?? "",
    ownerId: doc.ownerId,
    organizationId: doc.organizationId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
