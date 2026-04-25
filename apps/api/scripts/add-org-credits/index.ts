// Carrega créditos na wallet de uma organização (scope=org, source=admin_grant).
// Usado até termos Stripe institucional. Cria uma wallet nova por chamada —
// mesmo padrão do fluxo de topup pessoal, o que permite:
//   - expirações distintas por lote (ex: recarga mensal de teste).
//   - auditoria fácil pelo ledger (uma entry `admin_grant` por chamada).
//
// Idempotência: NÃO é idempotente por natureza (a ideia é "cada run é uma
// recarga"). Quem rodar duas vezes seguidas por engano cria duas wallets.
// Pra conferir antes, passe `--dry-run`.
//
// Uso:
//   pnpm --filter @lucida/api run billing:add-org-credits --org-slug=lucida-teste --amount=10000
//   pnpm --filter @lucida/api run billing:add-org-credits --org-id=<hex> --amount=5000 --expires-in-days=90
//   pnpm --filter @lucida/api run billing:add-org-credits --org-slug=lucida-teste --amount=5000 --dry-run
//
// Flags:
//   --org-slug=<s>            Identifica a org pelo slug (ex: "lucida-teste").
//   --org-id=<hex>            Alternativa: id hex direto (24 chars).
//   --amount=<n>              Inteiro positivo de créditos a adicionar.
//   --expires-in-days=<n>     Opcional. Se omitido, wallet nunca expira.
//   --dry-run                 Imprime o plano sem gravar nada.

import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import { MongooseWalletRepository } from "../../src/domains/billing/infrastructure/mongoose-wallet-repository.js";
import { MongooseLedgerRepository } from "../../src/domains/billing/infrastructure/mongoose-ledger-repository.js";
import { CreditWallet } from "../../src/domains/billing/domain/credit-wallet.js";
import { LedgerEntry } from "../../src/domains/billing/domain/ledger-entry.js";

interface Args {
  orgSlug: string | null;
  orgId: string | null;
  amount: number;
  expiresInDays: number | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    orgSlug: null,
    orgId: null,
    amount: 0,
    expiresInDays: null,
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--org-slug=")) out.orgSlug = arg.slice("--org-slug=".length);
    else if (arg.startsWith("--org-id=")) out.orgId = arg.slice("--org-id=".length);
    else if (arg.startsWith("--amount=")) {
      const n = Number.parseInt(arg.slice("--amount=".length), 10);
      if (Number.isFinite(n) && n > 0) out.amount = n;
    } else if (arg.startsWith("--expires-in-days=")) {
      const n = Number.parseInt(arg.slice("--expires-in-days=".length), 10);
      if (Number.isFinite(n) && n > 0) out.expiresInDays = n;
    }
  }
  return out;
}

async function resolveOrgId(args: Args): Promise<{ id: string; name: string; slug: string }> {
  const authDb = await getAuthDb(env.MONGODB_URI);
  const orgs = authDb.collection<{
    _id: ObjectId;
    name?: string;
    slug?: string;
  }>("organization");

  if (args.orgId) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(args.orgId);
    } catch {
      throw new Error(`--org-id inválido (não é ObjectId hex): ${args.orgId}`);
    }
    const doc = await orgs.findOne({ _id: oid });
    if (!doc) throw new Error(`Org não encontrada pelo id ${args.orgId}`);
    return {
      id: String(doc._id),
      name: doc.name ?? "",
      slug: doc.slug ?? "",
    };
  }

  if (args.orgSlug) {
    const doc = await orgs.findOne({ slug: args.orgSlug });
    if (!doc) throw new Error(`Org não encontrada pelo slug "${args.orgSlug}"`);
    return {
      id: String(doc._id),
      name: doc.name ?? "",
      slug: doc.slug ?? "",
    };
  }

  throw new Error("Informe --org-slug ou --org-id");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.orgSlug && !args.orgId) {
    throw new Error("Informe --org-slug=<slug> ou --org-id=<hex>");
  }
  if (args.amount <= 0) {
    throw new Error("Informe --amount=<n> com n inteiro positivo");
  }

  const org = await resolveOrgId(args);
  const expiresAt = args.expiresInDays
    ? new Date(Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  console.log(`
╭─ Adicionar créditos à organização ─────────────────────
│  org:        ${org.name} (${org.slug})
│  org id:     ${org.id}
│  amount:     +${args.amount.toLocaleString("pt-BR")} créditos
│  expira em:  ${expiresAt ? expiresAt.toISOString() : "nunca"}
│  mode:       ${args.dryRun ? "DRY-RUN (não escreve)" : "APPLY"}
╰─────────────────────────────────────────────────────────
`);

  if (args.dryRun) {
    console.log("[dry-run] nada foi gravado.");
    return;
  }

  // Conecta Mongoose pra usar os repos de wallet/ledger.
  await mongoose.connect(env.MONGODB_URI);

  const walletRepo = new MongooseWalletRepository();
  const ledgerRepo = new MongooseLedgerRepository();

  const walletId = walletRepo.nextId();
  const wallet = CreditWallet.create({
    id: walletId,
    scope: "org",
    ownerId: org.id,
    source: "admin_grant",
    initialBalance: args.amount,
    expiresAt,
    externalRef: null,
  });
  await walletRepo.save(wallet);
  console.log(`[ok] wallet criada: ${walletId.toString()}`);

  const entry = LedgerEntry.create({
    id: ledgerRepo.nextId(),
    scope: "org",
    ownerId: org.id,
    actorUserId: null, // ação administrativa (script), sem ator humano no BA
    walletId,
    walletSource: "admin_grant",
    type: "credit",
    amount: args.amount,
    reason: "admin_grant",
    metadata: { source: "script:add-org-credits" },
  });
  await ledgerRepo.save(entry);
  console.log(`[ok] ledger entry criada: ${entry.id.toString()}`);

  console.log("\nsucesso.");
}

main()
  .then(async () => {
    await mongoose.disconnect();
    await closeAuthDb();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    await mongoose.disconnect();
    await closeAuthDb();
    process.exit(1);
  });
