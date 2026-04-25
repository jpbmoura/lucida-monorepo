// Renomeia as collections do sistema legacy (`users`, `classes`, `exams`,
// `students`, `results`, `scanresults`, `integrations`) pro prefixo
// `legacy_*` — isola os dados do Clerk/legacy das collections do monorepo
// (`classes`, `exams`, `students` colidem por default do Mongoose).
//
// Dry-run por padrão. `--apply` executa. `--rollback` desfaz.
//
// Uso:
//   pnpm --filter @lucida/api run migrate:legacy-rename              # dry-run
//   pnpm --filter @lucida/api run migrate:legacy-rename --apply      # renomeia
//   pnpm --filter @lucida/api run migrate:legacy-rename --rollback --apply
//
// Flags:
//   --uri=<uri>     sobrepõe MONGODB_URI (útil pra apontar num banco
//                   legacy isolado, ex: prod legacy ≠ prod monorepo)
//   --apply         escreve de fato (sem isso é só dry-run)
//   --rollback      inverte: legacy_* → nome original
//
// Safety: nunca sobrescreve uma collection existente — se tanto a `from`
// quanto a `to` existirem, a operação é marcada como "skip" com motivo.
// `renameCollection` do MongoDB é atômico e instantâneo (só muda metadado,
// não move docs).

import mongoose from "mongoose";
import { env } from "../../src/env.js";
import { LEGACY_COLLECTIONS } from "../legacy-collection-map.js";

interface Flags {
  apply: boolean;
  rollback: boolean;
  uri: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    apply: false,
    rollback: false,
    uri: env.MONGODB_URI,
  };
  for (const arg of argv) {
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--rollback") flags.rollback = true;
    else if (arg.startsWith("--uri=")) flags.uri = arg.slice("--uri=".length);
  }
  return flags;
}

type StepAction = "rename" | "skip-missing" | "skip-conflict" | "skip-noop";

interface Step {
  from: string;
  to: string;
  action: StepAction;
  reason?: string;
}

async function listCollections(
  db: NonNullable<mongoose.Connection["db"]>,
): Promise<Set<string>> {
  const cols = await db.listCollections({}, { nameOnly: true }).toArray();
  return new Set(cols.map((c) => c.name));
}

function buildPlan(existing: Set<string>, rollback: boolean): Step[] {
  const pairs = rollback
    ? LEGACY_COLLECTIONS.map((p) => ({ from: p.renamed, to: p.original }))
    : LEGACY_COLLECTIONS.map((p) => ({ from: p.original, to: p.renamed }));

  const plan: Step[] = [];
  for (const { from, to } of pairs) {
    if (!existing.has(from)) {
      plan.push({
        from,
        to,
        action: "skip-missing",
        reason: `source "${from}" not present`,
      });
      continue;
    }
    if (existing.has(to)) {
      plan.push({
        from,
        to,
        action: "skip-conflict",
        reason: `target "${to}" already exists — manual review required`,
      });
      continue;
    }
    plan.push({ from, to, action: "rename" });
  }
  return plan;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  await mongoose.connect(flags.uri);
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("mongoose connection missing db");

    const existing = await listCollections(db);
    const plan = buildPlan(existing, flags.rollback);

    process.stdout.write(
      JSON.stringify(
        {
          ts: new Date().toISOString(),
          direction: flags.rollback ? "rollback" : "rename",
          apply: flags.apply,
          plan,
        },
        null,
        2,
      ) + "\n",
    );

    if (!flags.apply) {
      process.stderr.write(
        "\n(dry-run — nothing applied. Re-run with --apply to execute.)\n",
      );
      return;
    }

    let renamed = 0;
    let skipped = 0;
    for (const step of plan) {
      if (step.action !== "rename") {
        skipped++;
        continue;
      }
      await db.renameCollection(step.from, step.to);
      process.stderr.write(`✓ ${step.from} → ${step.to}\n`);
      renamed++;
    }

    process.stderr.write(
      `\n${flags.rollback ? "Rollback" : "Rename"} done: ${renamed} applied, ${skipped} skipped.\n`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  process.stderr.write(
    `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
