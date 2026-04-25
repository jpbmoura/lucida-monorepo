import { randomUUID } from "node:crypto";
import { Class } from "../domain/class.js";
import { ClassId } from "../domain/class-id.js";
import type { ClassRepository } from "../domain/class-repository.js";
import { ClassModel, type ClassDoc } from "./class-schema.js";

export class MongooseClassRepository implements ClassRepository {
  nextId(): ClassId {
    return ClassId.of(randomUUID());
  }

  async save(cls: Class): Promise<void> {
    await ClassModel.updateOne(
      { _id: cls.id.toString() },
      {
        $set: {
          name: cls.name,
          description: cls.description,
          ownerId: cls.ownerId,
        },
        $setOnInsert: {
          _id: cls.id.toString(),
          createdAt: cls.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: ClassId): Promise<Class | null> {
    const doc = await ClassModel.findById(id.toString()).lean<ClassDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Class[]> {
    const docs = await ClassModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean<ClassDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: ClassId): Promise<void> {
    await ClassModel.deleteOne({ _id: id.toString() }).exec();
  }
}

function toEntity(doc: ClassDoc): Class {
  return Class.restore({
    id: ClassId.of(doc._id),
    name: doc.name,
    description: doc.description ?? "",
    ownerId: doc.ownerId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
