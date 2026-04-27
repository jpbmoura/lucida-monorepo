import { randomUUID } from "node:crypto";
import { Class } from "../domain/class.js";
import { ClassId } from "../domain/class-id.js";
import type {
  ClassPage,
  ClassPageCursor,
  ClassRepository,
} from "../domain/class-repository.js";
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
          subject: cls.subject,
          grade: cls.grade,
          ownerId: cls.ownerId,
          organizationId: cls.organizationId,
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

  async findByOrganizationPaginated(
    organizationId: string,
    options: {
      limit: number;
      cursor?: ClassPageCursor | null;
      teacherId?: string | null;
    },
  ): Promise<ClassPage> {
    const filter: Record<string, unknown> = { organizationId };
    if (options.teacherId) filter.ownerId = options.teacherId;

    // Cursor: queremos itens "depois" do cursor na ordem (createdAt desc,
    // _id desc). Ou seja: createdAt menor que o cursor, OU createdAt igual
    // e _id lexicograficamente menor (tiebreak estável).
    if (options.cursor) {
      const cursorDate = new Date(options.cursor.createdAt);
      filter.$or = [
        { createdAt: { $lt: cursorDate } },
        {
          createdAt: cursorDate,
          _id: { $lt: options.cursor.id },
        },
      ];
    }

    // Pega `limit + 1` pra detectar se há próxima página sem segunda query.
    const docs = await ClassModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(options.limit + 1)
      .lean<ClassDoc[]>()
      .exec();

    const hasMore = docs.length > options.limit;
    const slice = hasMore ? docs.slice(0, options.limit) : docs;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last._id }
        : null;

    return {
      items: slice.map(toEntity),
      nextCursor,
    };
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
    subject: doc.subject ?? null,
    grade: doc.grade ?? null,
    ownerId: doc.ownerId,
    organizationId: doc.organizationId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
