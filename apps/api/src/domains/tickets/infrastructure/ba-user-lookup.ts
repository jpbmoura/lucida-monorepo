import { type Db } from "mongodb";
import type { UserLookup } from "../application/user-lookup.js";

/**
 * Lê do BA MongoDB (collection `user`). Email é case-insensitive — BA
 * salva como digitado, então normalizamos pra lower antes da query
 * (pode haver index case-sensitive; lower-case dá miss falso, mas é
 * aceitável vs. risco de falso match).
 */
export class BaUserLookup implements UserLookup {
  constructor(private readonly authDb: Db) {}

  async findIdByEmail(email: string): Promise<string | null> {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return null;
    // BA armazena email como string. Match exato após lowercase.
    const doc = await this.authDb
      .collection<{ _id: unknown; email: string }>("user")
      .findOne(
        { email: normalized },
        { projection: { _id: 1 } },
      );
    return doc ? String(doc._id) : null;
  }
}
