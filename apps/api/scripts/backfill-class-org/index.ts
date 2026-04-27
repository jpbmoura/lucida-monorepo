// Backfill: popula `classes.organizationId` a partir da membership do
// professor (`ownerId` → `member.organizationId` via BetterAuth).
// Idempotente — só toca docs onde `organizationId` ainda é null/missing.
//
// Uso:
//   pnpm --filter @lucida/api run backfill:class-org
//
// Flags:
//   --dry-run    relata o que faria sem escrever
//
// Mesma lógica do backfill-student-org: pra cada turma sem organizationId,
// busca a membership BA mais antiga do owner (ObjectId) e popula. Owner
// sem membership → fica com null (modo individual; ok pra rotas privadas
// e filtrado pelas rotas públicas).

import { ObjectId, type Db } from "mongodb";
import {
  connectMongo,
  disconnectMongo,
} from "../../src/infrastructure/database/mongodb/connection.js";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import mongoose from "mongoose";
import { ClassModel } from "../../src/domains/class/infrastructure/class-schema.js";

interface MemberDoc {
  _id: unknown;
  userId: unknown;
  organizationId: unknown;
  createdAt: Date;
}

async function resolveOrgForOwner(
  authDb: Db,
  ownerId: string,
  cache: Map<string, string | null>,
): Promise<string | null> {
  if (cache.has(ownerId)) return cache.get(ownerId)!;

  let userObjectId: ObjectId;
  try {
    userObjectId = new ObjectId(ownerId);
  } catch {
    cache.set(ownerId, null);
    return null;
  }

  const members = (await authDb
    .collection("member")
    .find({ userId: userObjectId })
    .sort({ createdAt: 1 })
    .toArray()) as unknown as MemberDoc[];

  const oldest = members[0];
  if (!oldest) {
    cache.set(ownerId, null);
    return null;
  }

  const orgId = String(oldest.organizationId);

  if (members.length > 1) {
    console.log(
      `[review] owner ${ownerId} pertence a ${members.length} orgs — escolhi a mais antiga (${orgId})`,
    );
  }

  cache.set(ownerId, orgId);
  return orgId;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectMongo(env.MONGODB_URI);
  const authDb = await getAuthDb(env.MONGODB_URI);

  const cursor = ClassModel.find({
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
  })
    .select({ _id: 1, ownerId: 1 })
    .lean()
    .cursor();

  const cache = new Map<string, string | null>();
  let total = 0;
  let updated = 0;
  let skipped = 0;

  for await (const doc of cursor) {
    total++;
    const orgId = await resolveOrgForOwner(authDb, doc.ownerId, cache);
    if (orgId === null) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry] ${doc._id} → org=${orgId}`);
      updated++;
      continue;
    }
    await ClassModel.updateOne(
      { _id: doc._id },
      { $set: { organizationId: orgId } },
    ).exec();
    updated++;
  }

  console.log(`
═══════════════ BACKFILL CLASS ORG ═══════════════
  total inspecionadas:   ${total}
  atualizadas${dryRun ? " (dry)" : ""}:  ${updated}
  sem org (skipped):     ${skipped}
  orgs únicas no cache:  ${cache.size}
═══════════════════════════════════════════════════
`);
}

main()
  .then(async () => {
    await disconnectMongo();
    await closeAuthDb();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    await mongoose.disconnect().catch(() => undefined);
    await closeAuthDb().catch(() => undefined);
    process.exit(1);
  });
