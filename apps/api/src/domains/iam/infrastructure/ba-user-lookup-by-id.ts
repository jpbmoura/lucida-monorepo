import { ObjectId, type Db } from "mongodb";
import type {
  UserBasicInfo,
  UserLookupById,
} from "../application/ports/user-lookup.js";

/**
 * Impl de `UserLookupById` em cima do BA MongoDB. Convenção de IDs do
 * BA: `_id` é ObjectId nativo no banco; aceita string hex como input
 * e converte. Retorna `null` quando id é inválido ou não existe.
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
      .collection<{ _id: ObjectId; name?: string; email?: string }>("user")
      .findOne({ _id: oid }, { projection: { name: 1, email: 1 } });
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name ?? null,
      email: doc.email ?? "",
    };
  }
}
