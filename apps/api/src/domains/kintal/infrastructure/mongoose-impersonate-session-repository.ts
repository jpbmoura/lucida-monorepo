import { randomUUID } from "node:crypto";
import type { ImpersonateSessionRepository } from "../application/ports/impersonate-session-repository.js";
import { ImpersonateSession } from "../domain/impersonate-session.js";
import { ImpersonateSessionId } from "../domain/impersonate-session-id.js";
import {
  ImpersonateSessionModel,
  type ImpersonateSessionDoc,
} from "./impersonate-session-schema.js";

export class MongooseImpersonateSessionRepository
  implements ImpersonateSessionRepository
{
  nextId(): ImpersonateSessionId {
    return ImpersonateSessionId.of(randomUUID());
  }

  async save(session: ImpersonateSession): Promise<void> {
    await ImpersonateSessionModel.updateOne(
      { _id: session.id.toString() },
      {
        $set: {
          staffUserId: session.staffUserId,
          targetUserId: session.targetUserId,
          startedAt: session.startedAt,
          stoppedAt: session.stoppedAt,
          stopReason: session.stopReason,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
        },
        $setOnInsert: { _id: session.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(
    id: ImpersonateSessionId,
  ): Promise<ImpersonateSession | null> {
    const doc = await ImpersonateSessionModel.findById(id.toString())
      .lean<ImpersonateSessionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findOpenByStaff(
    staffUserId: string,
  ): Promise<ImpersonateSession | null> {
    const doc = await ImpersonateSessionModel.findOne({
      staffUserId,
      stoppedAt: null,
    })
      .sort({ startedAt: -1 })
      .lean<ImpersonateSessionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }
}

function toEntity(doc: ImpersonateSessionDoc): ImpersonateSession {
  return ImpersonateSession.restore({
    id: ImpersonateSessionId.of(doc._id),
    staffUserId: doc.staffUserId,
    targetUserId: doc.targetUserId,
    startedAt: doc.startedAt,
    stoppedAt: doc.stoppedAt,
    stopReason: doc.stopReason,
    userAgent: doc.userAgent,
    ipAddress: doc.ipAddress,
  });
}
