// Migration one-shot da Fase 3b.1. Faz três coisas em um run:
//
//   1. Backfill `scope: "user"` em todos os docs de `credit_wallets` e
//      `credit_ledger` que não têm o campo (docs criados antes do refactor
//      institucional). Sem isso, queries novas filtrando por `scope` iriam
//      ignorar os docs legados.
//   2. Backfill `actorUserId` nos ledger entries legados — setando igual
//      ao `ownerId` (em scope=user, ator e dono são a mesma pessoa).
//      `billingPeriodId` fica null (não se aplica a prepaid).
//   3. Garante entry default em `organization_billing_settings` pra toda
//      org existente. `billingMode: "pool"` (MVP).
//
// Idempotente: roda várias vezes sem efeito colateral.
//
// Uso:
//   pnpm --filter @lucida/api run migrate:billing-scope
//   pnpm --filter @lucida/api run migrate:billing-scope --dry-run

import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { env } from "../../src/env.js";
import { getAuthDb, closeAuthDb } from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import { OrganizationBillingSettings } from "../../src/domains/billing/domain/organization-billing-settings.js";
import { MongooseOrganizationBillingSettingsRepository } from "../../src/domains/billing/infrastructure/mongoose-organization-billing-settings-repository.js";

interface Flags {
  dryRun: boolean;
}

function parseFlags(argv: string[]): Flags {
  return { dryRun: argv.includes("--dry-run") };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const verb = flags.dryRun ? "[dry-run]" : "[apply]";

  await mongoose.connect(env.MONGODB_URI);
  const mongoDb = mongoose.connection.db;
  if (!mongoDb) throw new Error("mongoose connection missing db");

  // 1) Backfill scope nos wallets
  const walletsToFix = await mongoDb
    .collection("credit_wallets")
    .countDocuments({ scope: { $exists: false } });
  console.log(`${verb} credit_wallets sem scope: ${walletsToFix}`);
  if (!flags.dryRun && walletsToFix > 0) {
    const res = await mongoDb
      .collection("credit_wallets")
      .updateMany({ scope: { $exists: false } }, { $set: { scope: "user" } });
    console.log(`  → ${res.modifiedCount} atualizados`);
  }

  // 2) Backfill scope + actorUserId + billingPeriodId no ledger
  const ledgerToFix = await mongoDb
    .collection("credit_ledger")
    .countDocuments({ scope: { $exists: false } });
  console.log(`${verb} credit_ledger sem scope: ${ledgerToFix}`);
  if (!flags.dryRun && ledgerToFix > 0) {
    // updateMany com pipeline pode setar actorUserId baseado em ownerId.
    const res = await mongoDb.collection("credit_ledger").updateMany(
      { scope: { $exists: false } },
      [
        {
          $set: {
            scope: "user",
            actorUserId: "$ownerId",
            billingPeriodId: null,
          },
        },
      ],
    );
    console.log(`  → ${res.modifiedCount} atualizados`);
  }

  // 3) Provisiona organization_billing_settings pra cada org que ainda não tem.
  // Orgs vêm do BA DB (driver mongodb@7 separado). Settings vive no Mongoose db
  // (mesma conexão que o resto das collections de domínio), então o upsert
  // é feito via o repositório Mongoose que já usamos em produção.
  const authDb = await getAuthDb(env.MONGODB_URI);
  const orgs = await authDb.collection("organization").find({}).toArray();
  console.log(`${verb} organizações no BA DB: ${orgs.length}`);

  const settingsRepo = new MongooseOrganizationBillingSettingsRepository();
  let created = 0;
  for (const org of orgs) {
    const orgId = String(org._id as ObjectId);
    const existing = await settingsRepo.findByOrg(orgId);
    if (existing) continue;
    if (flags.dryRun) {
      console.log(`  [dry-run] criaria settings pra org ${orgId} (${org.slug ?? "?"})`);
      created++;
      continue;
    }
    await settingsRepo.save(OrganizationBillingSettings.createDefault(orgId));
    created++;
    console.log(`  → settings criadas pra org ${orgId} (${org.slug ?? "?"})`);
  }
  console.log(`${verb} total de settings provisionadas: ${created}`);

  console.log("\nmigration concluída.");
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
