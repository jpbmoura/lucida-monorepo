import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { TeacherAssistant } from "../domain/teacher-assistant.js";
import type {
  AssistantWithUser,
  TeacherAssistantRepository,
  TeacherWithMeta,
} from "../domain/teacher-assistant-repository.js";
import {
  TeacherAssistantModel,
  type TeacherAssistantDoc,
} from "./teacher-assistant-schema.js";

/**
 * Mongoose pra docs próprios + driver nativo (`authDb`) pra lookup em
 * `user`/`organization`/`member`. Não usamos `$lookup` cross-DB porque
 * a app aceita auth e Mongoose em conexões distintas.
 */
export class MongoTeacherAssistantRepository
  implements TeacherAssistantRepository
{
  constructor(private readonly authDb: Db) {}

  nextId(): string {
    return randomUUID();
  }

  async save(assistant: TeacherAssistant): Promise<void> {
    await TeacherAssistantModel.updateOne(
      { _id: assistant.id },
      {
        $set: {
          teacherUserId: assistant.teacherUserId,
          assistantUserId: assistant.assistantUserId,
          organizationId: assistant.organizationId,
          createdBy: assistant.createdBy,
          revokedAt: assistant.revokedAt,
        },
        $setOnInsert: { _id: assistant.id },
      },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<TeacherAssistant | null> {
    const doc = await TeacherAssistantModel.findById(id)
      .lean<TeacherAssistantDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async listAssistantsForTeacher(input: {
    teacherUserId: string;
    organizationId: string;
  }): Promise<AssistantWithUser[]> {
    const docs = await TeacherAssistantModel.find({
      teacherUserId: input.teacherUserId,
      organizationId: input.organizationId,
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean<TeacherAssistantDoc[]>()
      .exec();
    if (docs.length === 0) return [];

    const userMap = await fetchUsers(
      this.authDb,
      docs.map((d) => d.assistantUserId),
    );

    return docs.map<AssistantWithUser>((d) => {
      const u = userMap.get(d.assistantUserId);
      return {
        id: d._id,
        teacherUserId: d.teacherUserId,
        assistantUserId: d.assistantUserId,
        assistantName: u?.name ?? null,
        assistantEmail: u?.email ?? "",
        organizationId: d.organizationId,
        createdAt: d.createdAt,
        createdBy: d.createdBy,
      };
    });
  }

  async listTeachersForAssistant(input: {
    assistantUserId: string;
  }): Promise<TeacherWithMeta[]> {
    const docs = await TeacherAssistantModel.find({
      assistantUserId: input.assistantUserId,
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean<TeacherAssistantDoc[]>()
      .exec();
    if (docs.length === 0) return [];

    const teacherIds = docs.map((d) => d.teacherUserId);
    const orgIds = docs.map((d) => d.organizationId);
    const [userMap, orgMap, validMembership] = await Promise.all([
      fetchUsers(this.authDb, teacherIds),
      fetchOrganizations(this.authDb, orgIds),
      fetchActiveMemberships(this.authDb, docs),
    ]);

    return docs
      .filter((d) => validMembership.has(membershipKey(d)))
      .map<TeacherWithMeta>((d) => {
        const u = userMap.get(d.teacherUserId);
        const o = orgMap.get(d.organizationId);
        return {
          id: d._id,
          teacherUserId: d.teacherUserId,
          teacherName: u?.name ?? null,
          teacherEmail: u?.email ?? "",
          organizationId: d.organizationId,
          organizationName: o?.name ?? null,
          createdAt: d.createdAt,
        };
      });
  }

  async findActiveLink(input: {
    assistantUserId: string;
    teacherUserId: string;
  }): Promise<TeacherAssistant | null> {
    const doc = await TeacherAssistantModel.findOne({
      assistantUserId: input.assistantUserId,
      teacherUserId: input.teacherUserId,
      revokedAt: null,
    })
      .lean<TeacherAssistantDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async existsActiveLink(input: {
    assistantUserId: string;
    teacherUserId: string;
  }): Promise<boolean> {
    const count = await TeacherAssistantModel.countDocuments({
      assistantUserId: input.assistantUserId,
      teacherUserId: input.teacherUserId,
      revokedAt: null,
    }).exec();
    return count > 0;
  }

  async countActiveTeachersForAssistant(
    assistantUserId: string,
  ): Promise<number> {
    return TeacherAssistantModel.countDocuments({
      assistantUserId,
      revokedAt: null,
    }).exec();
  }
}

// ─── helpers ──────────────────────────────────────────────────────────

function toEntity(doc: TeacherAssistantDoc): TeacherAssistant {
  return TeacherAssistant.restore({
    id: doc._id,
    teacherUserId: doc.teacherUserId,
    assistantUserId: doc.assistantUserId,
    organizationId: doc.organizationId,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    revokedAt: doc.revokedAt,
  });
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
}

async function fetchUsers(
  authDb: Db,
  userIds: string[],
): Promise<Map<string, UserRow>> {
  if (userIds.length === 0) return new Map();
  const oids = userIds
    .map(tryObjectId)
    .filter((o): o is ObjectId => o !== null);
  if (oids.length === 0) return new Map();

  const docs = await authDb
    .collection<{ _id: ObjectId; name?: string | null; email?: string }>(
      "user",
    )
    .find({ _id: { $in: oids } })
    .project<{ _id: ObjectId; name?: string | null; email?: string }>({
      name: 1,
      email: 1,
    })
    .toArray();

  return new Map(
    docs.map((u) => [
      String(u._id),
      { id: String(u._id), name: u.name ?? null, email: u.email ?? "" },
    ]),
  );
}

async function fetchOrganizations(
  authDb: Db,
  orgIds: string[],
): Promise<Map<string, { id: string; name: string | null }>> {
  if (orgIds.length === 0) return new Map();
  const oids = orgIds
    .map(tryObjectId)
    .filter((o): o is ObjectId => o !== null);
  if (oids.length === 0) return new Map();

  const docs = await authDb
    .collection<{ _id: ObjectId; name?: string }>("organization")
    .find({ _id: { $in: oids } })
    .project<{ _id: ObjectId; name?: string }>({ name: 1 })
    .toArray();

  return new Map(
    docs.map((o) => [
      String(o._id),
      { id: String(o._id), name: o.name ?? null },
    ]),
  );
}

/**
 * Confere que o professor ainda é member da org. Vínculo cujo professor
 * deixou a org fica órfão e some do seletor (sem precisar de cron).
 */
async function fetchActiveMemberships(
  authDb: Db,
  docs: TeacherAssistantDoc[],
): Promise<Set<string>> {
  if (docs.length === 0) return new Set();
  const pairs = docs
    .map((d) => {
      const userOid = tryObjectId(d.teacherUserId);
      const orgOid = tryObjectId(d.organizationId);
      if (!userOid || !orgOid) return null;
      return { userOid, orgOid, key: membershipKey(d) };
    })
    .filter(
      (p): p is { userOid: ObjectId; orgOid: ObjectId; key: string } =>
        p !== null,
    );
  if (pairs.length === 0) return new Set();

  const memberDocs = await authDb
    .collection<{ userId: ObjectId; organizationId: ObjectId }>("member")
    .find({
      $or: pairs.map((p) => ({
        userId: p.userOid,
        organizationId: p.orgOid,
      })),
    })
    .project<{ userId: ObjectId; organizationId: ObjectId }>({
      userId: 1,
      organizationId: 1,
    })
    .toArray();

  const valid = new Set<string>();
  for (const m of memberDocs) {
    valid.add(`${String(m.userId)}|${String(m.organizationId)}`);
  }
  return valid;
}

function membershipKey(doc: TeacherAssistantDoc): string {
  return `${doc.teacherUserId}|${doc.organizationId}`;
}

function tryObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}
