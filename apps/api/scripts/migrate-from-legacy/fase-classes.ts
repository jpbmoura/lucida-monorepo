import {
  coerceDate,
  coerceString,
  legacyIdToString,
  newCounts,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyClass {
  _id: unknown;
  name?: string;
  description?: string;
  userId?: string; // Clerk
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function runClassesPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.classes = counts;

  const legacyCol = ctx.sourceDb.collection<LegacyClass>(LEGACY.classes);
  const targetCol = ctx.targetDb.collection("classes");

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
          entity: "class",
          status: "skip",
          legacyId,
          reason: `owner not in user map (clerkId=${clerkId})`,
        });
        continue;
      }

      const createdAt = coerceDate(legacy.createdAt);
      const updatedAt = coerceDate(legacy.updatedAt, createdAt);
      const doc = {
        _id: legacyId,
        ownerId,
        name: coerceString(legacy.name, "Turma sem nome"),
        description: coerceString(legacy.description, ""),
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
      ctx.logger({ entity: "class", status: "ok", legacyId, newId: legacyId });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "class",
        status: "error",
        legacyId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
