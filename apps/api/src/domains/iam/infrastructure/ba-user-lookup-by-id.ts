import { ObjectId, type Db } from "mongodb";
import type {
  UserBasicInfo,
  UserLookupById,
} from "../application/ports/user-lookup.js";

/**
 * Impl de `UserLookupById` em cima do BA MongoDB. IDs do BA são
 * normalmente ObjectId nativo (mongodbAdapter padrão), mas users
 * migrados do Clerk preservaram o id legado como string custom — então
 * tentamos os dois formatos no `_id`. Retorna `null` quando não existe.
 */
export class BaUserLookupById implements UserLookupById {
  constructor(private readonly authDb: Db) {}

  async findById(userId: string): Promise<UserBasicInfo | null> {
    const candidates: Array<ObjectId | string> = [userId];
    try {
      const oid = new ObjectId(userId);
      candidates.push(oid);
    } catch {
      // userId não é hex de 24 — string crua já é o único candidato.
    }
    const doc = await this.authDb
      .collection<{
        _id: ObjectId | string;
        name?: string;
        email?: string;
      }>("user")
      .findOne(
        { _id: { $in: candidates } },
        { projection: { name: 1, email: 1 } },
      );
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name ?? null,
      email: doc.email ?? "",
    };
  }
}
