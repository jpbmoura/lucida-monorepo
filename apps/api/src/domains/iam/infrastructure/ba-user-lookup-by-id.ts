import { ObjectId, type Db } from "mongodb";
import type {
  UserBasicInfo,
  UserLookupById,
} from "../application/ports/user-lookup.js";

/**
 * Impl de `UserLookupById` em cima do BA MongoDB. `_id` é sempre
 * ObjectId nativo (default do mongodbAdapter). Retorna `null` quando
 * não existe ou quando o input não é hex válido.
 */
export class BaUserLookupById implements UserLookupById {
  constructor(private readonly authDb: Db) {}

  async findById(userId: string): Promise<UserBasicInfo | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(userId);
    } catch {
      return null;
    }
    const doc = await this.authDb
      .collection<{
        _id: ObjectId;
        name?: string;
        email?: string;
      }>("user")
      .findOne({ _id: oid }, { projection: { name: 1, email: 1 } });
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name ?? null,
      email: doc.email ?? "",
    };
  }
}
