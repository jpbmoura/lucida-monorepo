import { randomUUID } from "node:crypto";
import { SlideDeck } from "../domain/slide-deck.js";
import { SlideDeckId } from "../domain/slide-deck-id.js";
import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";
import type { Slide } from "../domain/slide.js";
import { SlideDeckModel, type SlideDeckDoc, type SlideDoc } from "./slide-deck-schema.js";

export class MongooseSlideDeckRepository implements SlideDeckRepository {
  nextId(): SlideDeckId {
    return SlideDeckId.of(randomUUID());
  }

  async save(deck: SlideDeck): Promise<void> {
    await SlideDeckModel.updateOne(
      { _id: deck.id.toString() },
      {
        $set: {
          ownerId: deck.ownerId,
          organizationId: deck.organizationId,
          courseId: deck.courseId,
          title: deck.title,
          subject: deck.subject,
          gradeLevel: deck.gradeLevel,
          tone: deck.tone,
          theme: deck.theme,
          source: deck.source,
          slides: deck.slides,
          status: deck.status,
          usage: deck.usage,
        },
        $setOnInsert: {
          _id: deck.id.toString(),
          createdAt: deck.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: SlideDeckId): Promise<SlideDeck | null> {
    const doc = await SlideDeckModel.findById(id.toString())
      .lean<SlideDeckDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwnerId(ownerId: string): Promise<SlideDeck[]> {
    const docs = await SlideDeckModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean<SlideDeckDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: SlideDeckId): Promise<void> {
    await SlideDeckModel.deleteOne({ _id: id.toString() }).exec();
  }
}

function toSlide(doc: SlideDoc): Slide {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title ?? "",
    subtitle: doc.subtitle ?? null,
    blocks: doc.blocks ?? [],
    columns: doc.columns ?? [],
    image: doc.image ?? null,
    notes: doc.notes ?? null,
    bnccCodes: doc.bnccCodes ?? [],
  };
}

function toEntity(doc: SlideDeckDoc): SlideDeck {
  return SlideDeck.restore({
    id: SlideDeckId.of(doc._id),
    ownerId: doc.ownerId,
    organizationId: doc.organizationId ?? null,
    courseId: doc.courseId ?? null,
    title: doc.title,
    subject: doc.subject ?? "",
    gradeLevel: doc.gradeLevel ?? "",
    tone: doc.tone,
    theme: doc.theme,
    source: { type: doc.source.type, ref: doc.source.ref ?? null },
    slides: (doc.slides ?? []).map(toSlide),
    status: doc.status ?? "READY",
    usage: doc.usage ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
