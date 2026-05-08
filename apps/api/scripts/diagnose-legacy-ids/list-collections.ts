// Lista todas as collections do DB ativo, pra diagnosticar se a base
// conectada é a mesma de produção. One-shot.
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";

async function main(): Promise<void> {
  const db = await getAuthDb(env.MONGODB_URI);
  const colls = await db.listCollections().toArray();
  console.log(`DB: ${db.databaseName}`);
  console.log(`Collections (${colls.length}):`);
  for (const c of colls.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).estimatedDocumentCount();
    console.log(`  ${c.name.padEnd(40)} ${count}`);
  }
  await closeAuthDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
