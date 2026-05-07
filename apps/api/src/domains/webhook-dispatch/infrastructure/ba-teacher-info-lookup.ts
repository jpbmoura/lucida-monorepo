import { ObjectId, type Db } from "mongodb";
import type {
  TeacherInfo,
  TeacherInfoLookup,
} from "../application/ports/teacher-info-lookup.js";

interface BaUserDoc {
  _id: ObjectId;
  id?: string;
  name: string | null;
}

/**
 * Lookup direto na collection `user` da BetterAuth. `_id` é sempre
 * ObjectId nativo (default do mongodbAdapter).
 */
export class BaTeacherInfoLookup implements TeacherInfoLookup {
  constructor(private readonly authDb: Db) {}

  async findById(userId: string): Promise<TeacherInfo | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(userId);
    } catch {
      return null;
    }
    const row = (await this.authDb
      .collection("user")
      .findOne({ _id: oid })) as unknown as BaUserDoc | null;
    if (!row) return null;
    return {
      id: row.id ?? String(row._id),
      name: row.name ?? "(sem nome)",
    };
  }
}
