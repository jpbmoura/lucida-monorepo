// Normalização one-shot dos `user._id` em formato legado (UUID string)
// para ObjectId nativo da BetterAuth. Resolve a classe de bugs em que
// `new ObjectId(_id)` quebra silenciosamente pra users migrados do Clerk.
//
// Uso:
//   pnpm --filter @lucida/api migrate:normalize-user-ids -- --dry-run
//   pnpm --filter @lucida/api migrate:normalize-user-ids -- --apply
//   pnpm --filter @lucida/api migrate:normalize-user-ids -- --validate-only
//
// Default sem flag = --dry-run (segurança).
//
// Fases:
//   1. Build ID_MAP (lega na primeira execução em `.id-map.json`).
//   2. Dry-run: conta docs afetados em cada (collection, field) sem gravar.
//   3. Apply: pra cada legacy user, copia doc com novo _id, reescreve FKs,
//      checkpointing incremental no .id-map.json.
//   4. Cleanup: deleta user antigo + sessions desses users.
//   5. Validate: confirma que nenhum legacy id sobrou em campo do inventário.
//
// O script é IDEMPOTENTE — se interrompido, retoma do último checkpoint.

import mongoose from "mongoose";
import { ObjectId, type Db } from "mongodb";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import {
  USER_FK_INVENTORY,
  TOUCHED_COLLECTIONS,
  type FkSpec,
} from "./inventory.js";
import {
  loadOrBuildIdMap,
  saveIdMap,
  getIdMapPath,
  type IdMap,
  type IdMapEntry,
} from "./id-map.js";

interface Args {
  apply: boolean;
  dryRun: boolean;
  validateOnly: boolean;
  cleanupOnly: boolean;
  rewriteOnly: boolean;
  mapPath: string | null;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    dryRun: false,
    validateOnly: false,
    cleanupOnly: false,
    rewriteOnly: false,
    mapPath: null,
  };
  for (const arg of argv) {
    if (arg === "--apply") out.apply = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--validate-only") out.validateOnly = true;
    else if (arg === "--cleanup-only") out.cleanupOnly = true;
    else if (arg === "--rewrite-only") out.rewriteOnly = true;
    else if (arg.startsWith("--map=")) out.mapPath = arg.slice("--map=".length);
  }
  // Default: dry-run quando nenhuma flag de execução foi passada.
  if (
    !out.apply &&
    !out.dryRun &&
    !out.validateOnly &&
    !out.cleanupOnly &&
    !out.rewriteOnly
  ) {
    out.dryRun = true;
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mapPath = getIdMapPath(args.mapPath);

  console.log("──────────────────────────────────────────────────────");
  console.log(" Normalize legacy user._id → ObjectId");
  console.log("──────────────────────────────────────────────────────");
  console.log(
    ` Mode: ${
      args.apply
        ? "APPLY ⚠️"
        : args.validateOnly
          ? "VALIDATE-ONLY"
          : args.cleanupOnly
            ? "CLEANUP-ONLY"
            : args.rewriteOnly
              ? "REWRITE-ONLY ⚠️"
              : "DRY-RUN"
    }`,
  );
  console.log(` Map:  ${mapPath}`);
  console.log("");

  // Conecta os dois drivers — Mongoose pra collections de domínio,
  // mongodb nativo pra BA. Mesmo URI, mesma DB lógica.
  await mongoose.connect(env.MONGODB_URI);
  const authDb = await getAuthDb(env.MONGODB_URI);

  try {
    const { map, created } = await loadOrBuildIdMap(authDb, mapPath);
    console.log(
      ` ${created ? "Generated" : "Loaded"} id-map with ${map.entries.length} legacy user(s)`,
    );
    if (map.entries.length === 0) {
      console.log(" Nothing to migrate — todos os users já são ObjectId.");
      return;
    }

    // Resumo do mapa.
    if (created) {
      console.log("");
      console.log(" Sample (até 5 entries):");
      for (const e of map.entries.slice(0, 5)) {
        console.log(
          `   ${e.legacyId}  →  ${e.newId}   (${e.email ?? "<sem email>"})`,
        );
      }
      console.log("");
    }

    if (args.dryRun) {
      await runDryRun(authDb, map);
      return;
    }
    if (args.validateOnly) {
      await runValidate(authDb, map);
      return;
    }
    if (args.cleanupOnly) {
      await runCleanup(authDb, map, mapPath);
      return;
    }
    if (args.rewriteOnly) {
      await runRewriteOnly(authDb, map);
      return;
    }
    if (args.apply) {
      await runApply(authDb, map, mapPath);
      console.log("");
      console.log(" Apply concluído. Rode `--validate-only` pra checagem final.");
      console.log(" Sessions dos legacy users serão deletadas no `--cleanup-only`.");
      return;
    }
  } finally {
    await mongoose.disconnect();
    await closeAuthDb();
  }
}

// ─── Fase: dry-run ──────────────────────────────────────────────────────

async function runDryRun(authDb: Db, map: IdMap): Promise<void> {
  const legacyIds = map.entries.map((e) => e.legacyId);

  console.log("──────────────────────────────────────────────────────");
  console.log(" Dry-run: contagem de docs afetados por (collection, field)");
  console.log("──────────────────────────────────────────────────────");

  const rows: Array<{ collection: string; field: string; count: number; match: string }> = [];

  for (const fk of USER_FK_INVENTORY) {
    const filter = buildLegacyFilter(fk, legacyIds);
    const col = collectionFor(authDb, fk);
    const count = await col.countDocuments(filter);
    rows.push({
      collection: fk.collection,
      field: fk.field,
      count,
      match: fk.match ? JSON.stringify(fk.match) : "",
    });
  }

  // Print tabela alinhada.
  const colWidth = Math.max(...rows.map((r) => r.collection.length));
  const fldWidth = Math.max(...rows.map((r) => r.field.length));
  for (const r of rows) {
    const tag = r.match ? `  [${r.match}]` : "";
    console.log(
      `   ${r.collection.padEnd(colWidth)}  ${r.field.padEnd(fldWidth)}  ${String(r.count).padStart(6)}${tag}`,
    );
  }
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  console.log("");
  console.log(` Total docs a serem reescritos: ${total}`);
  console.log(` Total users legacy:            ${map.entries.length}`);
  console.log("");
  console.log(" Para aplicar: `--apply`. Para validar depois: `--validate-only`.");
}

// ─── Fase: apply ────────────────────────────────────────────────────────

async function runApply(
  authDb: Db,
  map: IdMap,
  mapPath: string,
): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(" Apply: copiando users + reescrevendo FKs");
  console.log("──────────────────────────────────────────────────────");

  let processed = 0;
  for (const entry of map.entries) {
    if (entry.status === "fksRewritten" || entry.status === "cleaned") {
      processed++;
      continue;
    }

    // 1. Cópia do doc user com novo _id (preserva todos os outros campos,
    // inclusive `legacyClerkId`).
    if (entry.status === "pending") {
      await copyUserDoc(authDb, entry);
      entry.status = "userCopied";
      await saveIdMap(map, mapPath);
    }

    // 2. Reescreve todas as foreign keys.
    if (entry.status === "userCopied") {
      await rewriteFks(authDb, entry);
      entry.status = "fksRewritten";
      await saveIdMap(map, mapPath);
    }

    processed++;
    console.log(
      `   [${String(processed).padStart(4)}/${map.entries.length}] ${entry.email ?? entry.legacyId}  →  ${entry.newId}`,
    );
  }
}

async function copyUserDoc(authDb: Db, entry: IdMapEntry): Promise<void> {
  const users = authDb.collection<{
    _id: ObjectId | string;
    [k: string]: unknown;
  }>("user");
  const existing = await users.findOne({ _id: entry.legacyId as never });
  if (!existing) {
    throw new Error(
      `User legacy não encontrado durante apply: ${entry.legacyId}. ` +
        `Pode ter sido deletado entre a geração do map e o apply. ` +
        `Edite manualmente o .id-map.json se necessário.`,
    );
  }
  const newOid = new ObjectId(entry.newId);

  // Já existe um doc com newId? (cenário improvável — só acontece se
  // alguém rodou apply em parte e o map foi regenerado).
  const collision = await users.findOne({ _id: newOid });
  if (collision) {
    throw new Error(
      `Colisão: já existe user com _id=${entry.newId}. ` +
        `Apague o map (.id-map.json) e regenere — ele vai gerar ObjectIds novos.`,
    );
  }

  // Constrói o doc novo. Preserva tudo, troca `_id` e `id` (campo lógico
  // que algumas variantes do BA usam).
  const { _id: _oldId, id: _oldLogicalId, ...rest } = existing as {
    _id: unknown;
    id?: unknown;
    [k: string]: unknown;
  };
  await users.insertOne({
    _id: newOid,
    ...rest,
    // Carimba o id legacy num campo de auditoria (já existe `legacyClerkId`,
    // mas o `_id` antigo era o UUID gerado pelo migrate-from-legacy — esse
    // valor é diferente do clerkId original e merece ficar registrado).
    legacyId: entry.legacyId,
  });
}

async function rewriteFks(authDb: Db, entry: IdMapEntry): Promise<void> {
  const newOid = new ObjectId(entry.newId);
  for (const fk of USER_FK_INVENTORY) {
    const col = collectionFor(authDb, fk);
    const filter: Record<string, unknown> = {
      ...(fk.match ?? {}),
      [fk.field]: entry.legacyId,
    };
    const replacement = fk.kind === "objectid" ? newOid : entry.newId;
    await col.updateMany(filter, { $set: { [fk.field]: replacement } });
  }
}

// ─── Fase: rewrite-only ─────────────────────────────────────────────────

/**
 * Doc-driven rewrite: pra cada (collection, field) do inventário, busca
 * apenas os docs que ainda têm o legacyId (small set), e reescreve em
 * `bulkWrite`. Vastly mais rápido que iterar 3634 users × 27 collections
 * (a versão antiga `--apply`-style fazia ~98k updateMany sequenciais).
 *
 * Idempotente: se nada está em legacy, o find devolve 0 e a fase pula.
 *
 * Antes do loop, pré-revoga links duplicados em `teacher_assistants`
 * pra evitar violação do índice parcial unique `uniq_active_link`.
 */
async function runRewriteOnly(authDb: Db, map: IdMap): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(" Rewrite-only (doc-driven): varre só os FKs órfãos");
  console.log("──────────────────────────────────────────────────────");

  const legacyToHex = new Map(map.entries.map((e) => [e.legacyId, e.newId]));

  await preRevokeDuplicateAssistantLinks(authDb, map);

  for (const fk of USER_FK_INVENTORY) {
    const col = authDb.collection(fk.collection);
    const filter: Record<string, unknown> = {
      ...(fk.match ?? {}),
      [fk.field]: { $in: Array.from(legacyToHex.keys()) },
    };
    const docs = (await col
      .find(filter)
      .project({ _id: 1, [fk.field]: 1 })
      .toArray()) as Array<{ _id: unknown; [k: string]: unknown }>;

    if (docs.length === 0) continue;

    const ops = docs.map((doc) => {
      const legacy = String(doc[fk.field]);
      const newVal = legacyToHex.get(legacy);
      if (!newVal) {
        // Doc tem id legacy fora do map. Não toca pra não corromper.
        return null;
      }
      const replacement = fk.kind === "objectid" ? new ObjectId(newVal) : newVal;
      return {
        updateOne: {
          filter: { _id: doc._id as never },
          update: { $set: { [fk.field]: replacement } },
        },
      };
    });
    const validOps = ops.filter(
      (o): o is NonNullable<typeof o> => o !== null,
    );
    if (validOps.length === 0) continue;

    const result = await col.bulkWrite(validOps, { ordered: false });
    console.log(
      `   ${fk.collection}.${fk.field}: ${result.modifiedCount} reescritos (${docs.length - validOps.length} pulados — id fora do map)`,
    );
  }

  console.log("");
  console.log(" Rewrite-only concluído. Rode `--validate-only` pra confirmar.");
}

/**
 * Encontra docs ativos em `teacher_assistants` cujo `(teacherUserId,
 * assistantUserId)` — depois de remapeado via id-map — colidiria com
 * outro doc ativo já em hex. Soft-revoga o doc legacy (mantém pra
 * auditoria). Pré-condição pro rewriteFks rodar sem violar o índice
 * parcial unique `uniq_active_link`.
 */
async function preRevokeDuplicateAssistantLinks(
  authDb: Db,
  map: IdMap,
): Promise<void> {
  const col = authDb.collection<{
    _id: unknown;
    teacherUserId: string;
    assistantUserId: string;
    revokedAt: Date | null;
  }>("teacher_assistants");

  const legacyToHex = new Map(map.entries.map((e) => [e.legacyId, e.newId]));
  const legacyIds = map.entries.map((e) => e.legacyId);

  const docs = await col
    .find({
      revokedAt: null,
      $or: [
        { teacherUserId: { $in: legacyIds } },
        { assistantUserId: { $in: legacyIds } },
      ],
    })
    .toArray();

  let revoked = 0;
  for (const doc of docs) {
    const newTeacher = legacyToHex.get(doc.teacherUserId) ?? doc.teacherUserId;
    const newAssistant =
      legacyToHex.get(doc.assistantUserId) ?? doc.assistantUserId;
    const dup = await col.findOne({
      _id: { $ne: doc._id },
      revokedAt: null,
      teacherUserId: newTeacher,
      assistantUserId: newAssistant,
    });
    if (!dup) continue;

    await col.updateOne(
      { _id: doc._id },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } },
    );
    revoked++;
    console.log(
      `   Soft-revoke ${String(doc._id)} → duplica de ${String(dup._id)} (teacher=${newTeacher}, assistant=${newAssistant})`,
    );
  }
  if (revoked > 0) {
    console.log(`   ${revoked} link(s) duplicado(s) revogados antes do rewrite.`);
    console.log("");
  }
}

// ─── Fase: validate ─────────────────────────────────────────────────────

async function runValidate(authDb: Db, map: IdMap): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(" Validate: procurando órfãos com legacy id");
  console.log("──────────────────────────────────────────────────────");

  const legacyIds = map.entries.map((e) => e.legacyId);
  let total = 0;
  for (const fk of USER_FK_INVENTORY) {
    const col = collectionFor(authDb, fk);
    const filter = buildLegacyFilter(fk, legacyIds);
    const count = await col.countDocuments(filter);
    if (count > 0) {
      console.log(
        `   ⚠️  ${fk.collection}.${fk.field}: ${count} doc(s) ainda com legacy id`,
      );
      total += count;
    }
  }

  // Sweep extra: qualquer doc em qualquer coleção tocada com campo
  // claramente "userId-like" que ainda contenha um legacyId.
  for (const collName of TOUCHED_COLLECTIONS) {
    if (collName === "user") continue;
    // Best-effort — só lista, não falha. Útil pra detectar campo que
    // esquecemos no inventário.
    // (No-op por enquanto. Se quisermos heurística, viria aqui.)
  }

  if (total === 0) {
    console.log(" ✅ Nenhum órfão encontrado — todos os FKs foram reescritos.");
  } else {
    console.log(`   Total de docs com legacy id: ${total}`);
    console.log(" 🛑 Re-rode `--apply` (idempotente) ou inspecione manualmente.");
  }
}

// ─── Fase: cleanup ──────────────────────────────────────────────────────

async function runCleanup(
  authDb: Db,
  map: IdMap,
  mapPath: string,
): Promise<void> {
  console.log("──────────────────────────────────────────────────────");
  console.log(" Cleanup: deletando users legacy + sessions");
  console.log("──────────────────────────────────────────────────────");

  const users = authDb.collection("user");
  const sessions = authDb.collection("session");

  let deletedUsers = 0;
  let deletedSessions = 0;
  for (const entry of map.entries) {
    if (entry.status === "cleaned") continue;
    if (entry.status !== "fksRewritten") {
      console.log(
        `   ⚠️  ${entry.email ?? entry.legacyId}: status=${entry.status} — pulei (rode --apply primeiro).`,
      );
      continue;
    }

    // Sessions: BA armazena `userId` como ObjectId nativo. Como o user
    // legacy tinha _id string, sessions desse user têm `userId: <string>`.
    // O id novo já foi reescrito no apply (caminho FK), então qui só
    // resta deletar.
    const sessRes = await sessions.deleteMany({ userId: entry.legacyId });
    deletedSessions += sessRes.deletedCount ?? 0;

    // Deleta o doc user antigo.
    const userRes = await users.deleteOne({ _id: entry.legacyId as never });
    deletedUsers += userRes.deletedCount ?? 0;

    entry.status = "cleaned";
    await saveIdMap(map, mapPath);
  }

  console.log(` Deletados ${deletedUsers} user(s) legacy + ${deletedSessions} session(s).`);
}

// ─── Helpers ────────────────────────────────────────────────────────────

function collectionFor(authDb: Db, fk: FkSpec) {
  // BA collections vivem em `authDb`; Mongoose collections também usam
  // a mesma DB (mesma URI), mas via mongoose. Aqui pra updateMany direto
  // usamos o driver nativo em ambos os casos — mais previsível, sem
  // hooks/middleware do Mongoose.
  if (fk.source === "ba") return authDb.collection(fk.collection);
  // Mongoose collection name é igual ao da default DB do client nativo.
  return authDb.collection(fk.collection);
}

function buildLegacyFilter(
  fk: FkSpec,
  legacyIds: string[],
): Record<string, unknown> {
  // FK Mongoose stora string → bate exato.
  // FK BA stora ObjectId, mas pros legacy users o valor está como string
  // (porque user._id é string). Filtra como string.
  return {
    ...(fk.match ?? {}),
    [fk.field]: { $in: legacyIds },
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
