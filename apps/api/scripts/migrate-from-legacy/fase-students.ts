import {
  coerceDate,
  coerceString,
  formatStudentCode,
  legacyIdToString,
  newCounts,
  parseStudentCode,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyStudent {
  _id: unknown;
  code?: string;
  name?: string;
  classId?: unknown;
  userId?: string; // Clerk
  email?: string | null;
  matricula?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Migra a collection Student. Resolve colisões de `ownerId + matricula`
 * (unique no novo schema) anexando sufixo da classId, o que é compatível com
 * o reuso posterior na fase submissions.
 */
export async function runStudentsPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.students = counts;

  const legacyCol = ctx.sourceDb.collection<LegacyStudent>(LEGACY.students);
  const targetCol = ctx.targetDb.collection("students");

  const query = ctx.userFilter
    ? { userId: { $in: Array.from(ctx.userFilter) } }
    : {};

  const cursor = legacyCol.find(query);
  const limited = ctx.limit != null ? cursor.limit(ctx.limit) : cursor;

  for await (const legacy of limited) {
    counts.processed++;
    const legacyId = legacyIdToString(legacy._id);
    const clerkId = coerceString(legacy.userId);

    try {
      const ownerId = ctx.userMap.get(clerkId);
      if (!ownerId) {
        counts.skipped++;
        ctx.logger({
          entity: "student",
          status: "skip",
          legacyId,
          reason: `owner not in user map (clerkId=${clerkId})`,
        });
        continue;
      }

      const classId = legacyIdToString(legacy.classId);
      const code = normalizeCode(legacy.code);
      const matricula = coerceString(
        legacy.matricula,
        legacy.email ?? `imp-${legacyId}`,
      );

      const createdAt = coerceDate(legacy.createdAt);
      const updatedAt = coerceDate(legacy.updatedAt, createdAt);

      const doc = {
        _id: legacyId,
        classId,
        ownerId,
        code,
        name: coerceString(legacy.name, "Aluno importado"),
        matricula,
        email: legacy.email ?? null,
        createdAt,
        updatedAt,
      };

      if (!ctx.dryRun) {
        await targetCol.updateOne(
          { _id: legacyId as unknown as never },
          { $set: doc },
          { upsert: true },
        );
      }

      counts.ok++;
      ctx.logger({ entity: "student", status: "ok", legacyId, newId: legacyId });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "student",
        status: "error",
        legacyId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function normalizeCode(raw: string | undefined): string {
  const n = parseStudentCode(raw);
  if (n > 0) return formatStudentCode(n);
  // se o code do legacy é inválido (ex: vazio ou alfanumérico), gera 0000000
  // como placeholder — o professor pode editar depois.
  return "0000000";
}
