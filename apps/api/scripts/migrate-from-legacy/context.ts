import type mongoose from "mongoose";
import type { PhaseCounts } from "./helpers.js";

// Usa o `Db` re-exportado pelo mongoose pra evitar mismatch com a versão do
// pacote `mongodb` instalado na raiz (mongoose arrasta a sua própria).
export type Db = NonNullable<mongoose.Connection["db"]>;

export type Logger = (entry: LogEntry) => void;

export interface LogEntry {
  entity: string;
  status: "ok" | "skip" | "error" | "info";
  legacyId?: string;
  newId?: string;
  reason?: string;
  detail?: Record<string, unknown>;
}

export interface MigrationContext {
  // Banco de origem — collections `legacy_*`. Em QA costuma ser o mesmo DB
  // do target; em prod pode ser um cluster separado (via --legacy-uri).
  sourceDb: Db;
  // Banco de destino — collections do monorepo (`user`, `classes`, etc.).
  targetDb: Db;
  dryRun: boolean;
  limit: number | null;
  userFilter: Set<string> | null;
  // Clerk ID → BA user ID. Preenchido na fase users e lido por todas as fases
  // downstream pra traduzir ownerId.
  userMap: Map<string, string>;
  logger: Logger;
  summary: Record<string, PhaseCounts>;
}

export function makeJsonLogger(): Logger {
  return (entry) => {
    process.stdout.write(
      JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n",
    );
  };
}
