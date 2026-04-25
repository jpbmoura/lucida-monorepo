// CLI de migração do banco legacy (Clerk + coleções `legacy_*` após rename)
// pro shape novo do monorepo (BetterAuth + coleções lowercase). Idempotente
// por desenho — rodar duas vezes é seguro.
//
// Pré-requisito: rodar `pnpm migrate:legacy-rename --apply` antes, uma única
// vez por banco, pra isolar `users`/`classes`/`exams`/... em `legacy_*`.
//
// Uso:
//   pnpm --filter @lucida/api run migrate:legacy --dry-run
//   pnpm --filter @lucida/api run migrate:legacy --entity=users --limit=10
//   pnpm --filter @lucida/api run migrate:legacy
//
// Flags:
//   --dry-run                 não escreve nada, só reporta
//   --entity=<nome>           users | classes | students | exams | submissions | scans | all
//   --limit=<N>               limita N docs por fase (útil pra smoke test)
//   --user-ids=<a,b,c>        restringe a uma lista de Clerk user IDs
//   --skip-validate           não roda sanity checks no final
//   --legacy-uri=<uri>        se informado, abre conexão separada pro banco
//                             de origem. Útil em prod quando legacy e monorepo
//                             ficam em clusters distintos. Default: usa a
//                             mesma conexão do MONGODB_URI.

import mongoose from "mongoose";
import { env } from "../../src/env.js";
import { makeJsonLogger, type Db, type MigrationContext } from "./context.js";
import { newCounts } from "./helpers.js";
import { runUsersPhase } from "./fase-users.js";
import { runClassesPhase } from "./fase-classes.js";
import { runStudentsPhase } from "./fase-students.js";
import { runExamsPhase } from "./fase-exams.js";
import { runSubmissionsPhase } from "./fase-submissions.js";
import { runScansPhase } from "./fase-scans.js";
import { runSanityChecks } from "./validate.js";

type EntityName =
  | "users"
  | "classes"
  | "students"
  | "exams"
  | "submissions"
  | "scans"
  | "all";

interface ParsedFlags {
  dryRun: boolean;
  entity: EntityName;
  limit: number | null;
  userIds: Set<string> | null;
  skipValidate: boolean;
  legacyUri: string | null;
}

function parseFlags(argv: string[]): ParsedFlags {
  const flags: ParsedFlags = {
    dryRun: false,
    entity: "all",
    limit: null,
    userIds: null,
    skipValidate: false,
    legacyUri: null,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--skip-validate") flags.skipValidate = true;
    else if (arg.startsWith("--entity=")) {
      const v = arg.slice("--entity=".length) as EntityName;
      flags.entity = v;
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) flags.limit = n;
    } else if (arg.startsWith("--user-ids=")) {
      const list = arg.slice("--user-ids=".length).split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) flags.userIds = new Set(list);
    } else if (arg.startsWith("--legacy-uri=")) {
      const uri = arg.slice("--legacy-uri=".length).trim();
      if (uri) flags.legacyUri = uri;
    }
  }
  return flags;
}

async function preloadUserMap(ctx: MigrationContext): Promise<void> {
  const cursor = ctx.targetDb.collection<{
    _id: string;
    legacyClerkId?: string;
  }>("user").find({ legacyClerkId: { $exists: true } }, {
    projection: { _id: 1, legacyClerkId: 1 },
  });
  for await (const doc of cursor) {
    if (doc.legacyClerkId) ctx.userMap.set(doc.legacyClerkId, String(doc._id));
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  // Target: sempre a conexão principal (MONGODB_URI). BA lê/escreve aqui.
  await mongoose.connect(env.MONGODB_URI);
  const targetDb = mongoose.connection.db;
  if (!targetDb) throw new Error("target connection missing db");

  // Source: se --legacy-uri foi passado, cria conexão separada; senão
  // reusa a mesma do target (caso QA onde legacy e monorepo coabitam).
  let sourceConn: mongoose.Connection | null = null;
  let sourceDb: Db;
  if (flags.legacyUri) {
    sourceConn = mongoose.createConnection(flags.legacyUri);
    await sourceConn.asPromise();
    if (!sourceConn.db) throw new Error("source connection missing db");
    sourceDb = sourceConn.db;
  } else {
    sourceDb = targetDb;
  }

  const logger = makeJsonLogger();

  const ctx: MigrationContext = {
    sourceDb,
    targetDb,
    dryRun: flags.dryRun,
    limit: flags.limit,
    userFilter: flags.userIds,
    userMap: new Map(),
    logger,
    summary: {},
  };

  logger({
    entity: "meta",
    status: "info",
    reason: "migration started",
    detail: {
      dryRun: flags.dryRun,
      entity: flags.entity,
      limit: flags.limit,
      userIdsCount: flags.userIds?.size ?? null,
      separateLegacyUri: flags.legacyUri != null,
    },
  });

  // Pré-carrega mapa Clerk→BA de runs anteriores pra que fases parciais
  // (--entity=exams) funcionem sem precisar rodar users de novo.
  await preloadUserMap(ctx);
  if (ctx.userMap.size > 0) {
    ctx.summary["user-map-preload"] = {
      ...newCounts(),
      processed: ctx.userMap.size,
      ok: ctx.userMap.size,
    };
    logger({
      entity: "meta",
      status: "info",
      reason: "preloaded user map",
      detail: { size: ctx.userMap.size },
    });
  }

  const runAll = flags.entity === "all";

  try {
    if (runAll || flags.entity === "users") await runUsersPhase(ctx);
    if (runAll || flags.entity === "classes") await runClassesPhase(ctx);
    if (runAll || flags.entity === "students") await runStudentsPhase(ctx);
    if (runAll || flags.entity === "exams") await runExamsPhase(ctx);
    if (runAll || flags.entity === "submissions") await runSubmissionsPhase(ctx);
    if (runAll || flags.entity === "scans") await runScansPhase(ctx);

    if (runAll && !flags.skipValidate) {
      const report = await runSanityChecks(ctx);
      logger({
        entity: "sanity",
        status: "info",
        reason: "counts + orphan checks",
        detail: report as unknown as Record<string, unknown>,
      });
    }

    // Summary final vai pra stderr pra não misturar com logs JSON do stdout.
    process.stderr.write("\n===== MIGRATION SUMMARY =====\n");
    for (const [phase, counts] of Object.entries(ctx.summary)) {
      process.stderr.write(
        `${phase.padEnd(18)} processed=${counts.processed}  ok=${counts.ok}  skip=${counts.skipped}  err=${counts.errors}${
          Object.keys(counts.extra).length > 0
            ? "  extra=" + JSON.stringify(counts.extra)
            : ""
        }\n`,
      );
    }
    if (flags.dryRun) {
      process.stderr.write("\n(DRY RUN — no writes applied)\n");
    }
    process.stderr.write("=============================\n");
  } finally {
    await mongoose.disconnect();
    if (sourceConn) await sourceConn.close();
  }
}

main().catch((err) => {
  process.stderr.write(`\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
