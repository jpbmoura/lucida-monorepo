// Diagnostica dados que ainda estão em formato legado (id não-hex) depois
// que `migrate:normalize-user-ids` foi rodado. Read-only — não escreve
// nada.
//
// Uso:
//   pnpm --filter @lucida/api diagnose:legacy-ids
//   pnpm --filter @lucida/api diagnose:legacy-ids -- --email=demetriuslopes@gmail.com
//
// Reporta:
//  1. Users com `_id` em formato string (deveriam ter sido normalizados).
//  2. Foreign keys de user em todas as collections do inventário com
//     valor que NÃO é hex de 24 chars.
//  3. (Opcional) Detalhe de um user específico passado via --email.

import mongoose from "mongoose";
import { ObjectId, type Db } from "mongodb";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import { USER_FK_INVENTORY } from "../normalize-legacy-user-ids/inventory.js";

interface Args {
  email: string | null;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { email: null };
  for (const arg of argv) {
    if (arg.startsWith("--email=")) out.email = arg.slice("--email=".length);
  }
  return out;
}

const HEX_24 = /^[a-f0-9]{24}$/i;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log("──────────────────────────────────────────────────────");
  console.log(" Diagnóstico: ids legacy ainda no banco");
  console.log("──────────────────────────────────────────────────────");
  console.log("");

  await mongoose.connect(env.MONGODB_URI);
  const authDb = await getAuthDb(env.MONGODB_URI);

  try {
    await reportLegacyUsers(authDb);
    console.log("");
    await reportLegacyFks(authDb);
    if (args.email) {
      console.log("");
      await reportUserDetail(authDb, args.email);
    }
  } finally {
    await mongoose.disconnect();
    await closeAuthDb();
  }
}

async function reportLegacyUsers(authDb: Db): Promise<void> {
  const users = authDb.collection<{
    _id: ObjectId | string;
    email?: string;
    legacyClerkId?: string;
    legacyId?: string;
  }>("user");

  const docs = await users
    .find({ _id: { $type: "string" } as never })
    .project({ _id: 1, email: 1, legacyClerkId: 1, legacyId: 1 })
    .toArray();

  if (docs.length === 0) {
    console.log("✅ Users em formato legacy (_id string): 0");
    return;
  }
  console.log(`⚠️  Users em formato legacy (_id string): ${docs.length}`);
  for (const d of docs.slice(0, 20)) {
    console.log(
      `   _id=${String(d._id)}  email=${d.email ?? "?"}  legacyClerkId=${d.legacyClerkId ?? "?"}`,
    );
  }
  if (docs.length > 20) console.log(`   ... e mais ${docs.length - 20}`);
}

async function reportLegacyFks(authDb: Db): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(" Foreign keys com valor não-hex (por collection × campo)");
  console.log("──────────────────────────────────────────────────────");
  let total = 0;
  for (const fk of USER_FK_INVENTORY) {
    const col = authDb.collection(fk.collection);
    const filter: Record<string, unknown> = {
      ...(fk.match ?? {}),
      [fk.field]: { $not: HEX_24, $type: "string" },
    };
    const sample = await col
      .find(filter)
      .project({ [fk.field]: 1 })
      .limit(5)
      .toArray();
    const count = sample.length === 5 ? await col.countDocuments(filter) : sample.length;
    if (count > 0) {
      console.log(
        `   ⚠️  ${fk.collection}.${fk.field}: ${count} doc(s) com valor não-hex`,
      );
      for (const doc of sample) {
        const val = (doc as Record<string, unknown>)[fk.field];
        console.log(`      _id=${String(doc._id)}  ${fk.field}=${String(val)}`);
      }
      total += count;
    }
  }
  if (total === 0) {
    console.log("✅ Nenhum FK em formato legacy.");
  } else {
    console.log("");
    console.log(`Total docs órfãos: ${total}`);
  }
}

async function reportUserDetail(authDb: Db, email: string): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(` Detalhe do user: ${email}`);
  console.log("──────────────────────────────────────────────────────");
  const users = authDb.collection<{
    _id: ObjectId | string;
    email?: string;
    legacyClerkId?: string;
    legacyId?: string;
    name?: string;
  }>("user");
  const doc = await users.findOne({ email });
  if (!doc) {
    console.log("⚠️  user não encontrado.");
    return;
  }
  console.log(`   _id (raw):       ${String(doc._id)}`);
  console.log(`   _id type:        ${typeof doc._id === "object" ? "ObjectId" : typeof doc._id}`);
  console.log(`   _id is hex 24?:  ${HEX_24.test(String(doc._id)) ? "yes" : "no"}`);
  console.log(`   name:            ${doc.name ?? "?"}`);
  console.log(`   legacyClerkId:   ${doc.legacyClerkId ?? "?"}`);
  console.log(`   legacyId:        ${doc.legacyId ?? "?"}`);

  // Procura links onde esse user aparece como teacher OU assistant.
  // Usa o `authDb` (driver nativo) pra garantir que está no mesmo DB
  // que o `user` — Mongoose poderia conectar num DB diferente dependendo
  // da URI. Conta total de docs também pra diagnosticar conexão.
  const collectionInfo = await authDb.listCollections({ name: "teacherassistants" }).toArray();
  console.log("");
  console.log(`   Collection 'teacherassistants' existe?: ${collectionInfo.length > 0 ? "yes" : "no"}`);
  if (collectionInfo.length === 0) return;

  const taCol = authDb.collection<{
    _id: unknown;
    teacherUserId: string;
    assistantUserId: string;
    revokedAt: Date | null;
  }>("teacherassistants");
  const total = await taCol.countDocuments({});
  console.log(`   Total de links no banco: ${total}`);

  const candidates = [
    String(doc._id),
    ...(doc.legacyClerkId ? [doc.legacyClerkId] : []),
    ...(doc.legacyId ? [doc.legacyId] : []),
  ];
  const links = await taCol
    .find({
      $or: [
        { teacherUserId: { $in: candidates } },
        { assistantUserId: { $in: candidates } },
      ],
    })
    .toArray();
  console.log(`   Links envolvendo ele (qualquer formato de id): ${links.length}`);
  for (const l of links) {
    console.log(
      `     _id=${String(l._id)}  teacher=${l.teacherUserId}  assistant=${l.assistantUserId}  revoked=${l.revokedAt ? "yes" : "no"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
