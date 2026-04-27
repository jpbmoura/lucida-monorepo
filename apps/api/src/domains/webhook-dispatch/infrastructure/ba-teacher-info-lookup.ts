import { ObjectId, type Db } from "mongodb";
import type {
  TeacherInfo,
  TeacherInfoLookup,
} from "../application/ports/teacher-info-lookup.js";

interface BaUserDoc {
  _id: unknown;
  id?: string;
  name: string | null;
}

/**
 * Lookup direto na collection `user` da BetterAuth. Mesmo padrão usado
 * no `MongoStaffRepository` — BA armazena `_id` como ObjectId mas expõe
 * `id` string em algumas variantes; tentamos os dois caminhos.
 */
export class BaTeacherInfoLookup implements TeacherInfoLookup {
  constructor(private readonly authDb: Db) {}

  async findById(userId: string): Promise<TeacherInfo | null> {
    const users = this.authDb.collection("user");

    // Caminho 1: `id` lógico (string).
    let row = (await users.findOne({ id: userId })) as unknown as BaUserDoc | null;

    // Caminho 2: `_id` como ObjectId (formato canônico BA Mongo adapter).
    if (!row) {
      try {
        row = (await users.findOne({
          _id: new ObjectId(userId),
        })) as unknown as BaUserDoc | null;
      } catch {
        // userId não é hex válido — não há ObjectId pra tentar.
      }
    }

    // Caminho 3: `_id` string (alguns adapters legados).
    if (!row) {
      row = (await users.findOne({
        _id: userId as unknown as never,
      })) as unknown as BaUserDoc | null;
    }

    if (!row) return null;
    return {
      id: row.id ?? String(row._id),
      name: row.name ?? "(sem nome)",
    };
  }
}
