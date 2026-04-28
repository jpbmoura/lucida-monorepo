import type { PixTopupIntentRepository } from "../domain/pix-topup-intent-repository.js";
import { PixTopupIntent } from "../domain/pix-topup-intent.js";
import {
  PixTopupIntentModel,
  type PixTopupIntentDoc,
} from "./pix-topup-intent-schema.js";

export class MongoosePixTopupIntentRepository
  implements PixTopupIntentRepository
{
  async save(intent: PixTopupIntent): Promise<void> {
    await PixTopupIntentModel.updateOne(
      { _id: intent.abacateId },
      {
        $set: {
          ownerId: intent.ownerId,
          topupId: intent.topupId,
          amountCents: intent.amountCents,
          taxId: intent.taxId,
          status: intent.status,
          brCode: intent.brCode,
          brCodeBase64: intent.brCodeBase64,
          expiresAt: intent.expiresAt,
          paidAt: intent.paidAt,
          walletId: intent.walletId,
        },
        $setOnInsert: { _id: intent.abacateId },
      },
      { upsert: true },
    );
  }

  async findByAbacateId(abacateId: string): Promise<PixTopupIntent | null> {
    const doc = await PixTopupIntentModel.findById(abacateId)
      .lean<PixTopupIntentDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByAbacateIdAndOwner(
    abacateId: string,
    ownerId: string,
  ): Promise<PixTopupIntent | null> {
    const doc = await PixTopupIntentModel.findOne({ _id: abacateId, ownerId })
      .lean<PixTopupIntentDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }
}

function toEntity(doc: PixTopupIntentDoc): PixTopupIntent {
  return PixTopupIntent.restore({
    abacateId: doc._id,
    ownerId: doc.ownerId,
    topupId: doc.topupId,
    amountCents: doc.amountCents,
    taxId: doc.taxId,
    status: doc.status,
    brCode: doc.brCode,
    brCodeBase64: doc.brCodeBase64,
    expiresAt: doc.expiresAt,
    paidAt: doc.paidAt,
    walletId: doc.walletId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
