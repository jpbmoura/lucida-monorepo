import { ObjectId } from "mongodb";
import {
  bumpExtra,
  coerceDate,
  coerceString,
  isSyntheticEmail,
  newCounts,
  newId,
  syntheticEmail,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyUser {
  _id: unknown;
  id: string; // Clerk user_id
  username?: string | null;
  email?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Cria (ou reusa) um doc `user` do BetterAuth pra cada User legacy.
 *
 * Chaves de idempotência (ordem):
 *  1. já existe user BA com `legacyClerkId` = legacy.id → reusa
 *  2. já existe user BA com `email` = legacy.email (real)     → reusa + anota o legacyClerkId
 *  3. cria novo
 *
 * Users legacy sem `email` recebem email sintético `@legacy.lucida.invalid`
 * (RFC 2606 — nunca roteável). Ficam com `needsEmailUpdate: true` pra futura
 * ação admin.
 */
export async function runUsersPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.users = counts;

  const legacyCol = ctx.sourceDb.collection<LegacyUser>(LEGACY.users);
  const baCol = ctx.targetDb.collection("user");

  const query = ctx.userFilter
    ? { id: { $in: Array.from(ctx.userFilter) } }
    : {};

  const cursor = legacyCol.find(query, {
    projection: { id: 1, username: 1, email: 1, createdAt: 1, updatedAt: 1 },
  });
  const limited = ctx.limit != null ? cursor.limit(ctx.limit) : cursor;

  for await (const legacy of limited) {
    counts.processed++;
    const clerkId = coerceString(legacy.id);

    if (!clerkId) {
      counts.errors++;
      ctx.logger({
        entity: "user",
        status: "error",
        reason: "legacy doc missing `id` (Clerk)",
        detail: { _id: String(legacy._id) },
      });
      continue;
    }

    try {
      // 1. matcha por legacyClerkId
      const byClerk = await baCol.findOne({ legacyClerkId: clerkId });
      if (byClerk) {
        ctx.userMap.set(clerkId, String(byClerk._id));
        counts.skipped++;
        ctx.logger({
          entity: "user",
          status: "skip",
          legacyId: clerkId,
          newId: String(byClerk._id),
          reason: "already migrated (by legacyClerkId)",
        });
        continue;
      }

      const hasRealEmail = typeof legacy.email === "string" && legacy.email.trim() !== "";
      const email = hasRealEmail
        ? legacy.email!.trim().toLowerCase()
        : syntheticEmail(legacy.username, clerkId);
      const isSynthetic = isSyntheticEmail(email);

      // 2. matcha por email real
      if (!isSynthetic) {
        const byEmail = await baCol.findOne({ email });
        if (byEmail) {
          ctx.userMap.set(clerkId, String(byEmail._id));
          if (!ctx.dryRun) {
            await baCol.updateOne(
              { _id: byEmail._id },
              {
                $set: {
                  legacyClerkId: clerkId,
                  legacyUsername: legacy.username ?? null,
                  updatedAt: new Date(),
                },
              },
            );
          }
          counts.ok++;
          bumpExtra(counts, "matched-by-email");
          ctx.logger({
            entity: "user",
            status: "ok",
            legacyId: clerkId,
            newId: String(byEmail._id),
            reason: "matched existing BA user by email; tagged legacyClerkId",
          });
          continue;
        }
      }

      // 3. cria novo user
      const baId = newId();
      const name =
        legacy.username && legacy.username.trim()
          ? legacy.username.trim()
          : email.split("@")[0] ?? "Usuário";
      const createdAt = coerceDate(legacy.createdAt);
      const updatedAt = coerceDate(legacy.updatedAt, createdAt);

      if (!ctx.dryRun) {
        // `_id` precisa ser ObjectId nativo (não string hex) — senão BA
        // armazena como string e quebra todo lookup `new ObjectId(_id)`.
        // O `userMap` segue guardando o hex em string pra alimentar FKs
        // de outras fases, que são `type: String` nos schemas Mongoose.
        await baCol.insertOne({
          _id: new ObjectId(baId) as unknown as never,
          id: baId,
          email,
          emailVerified: !isSynthetic,
          name,
          image: null,
          createdAt,
          updatedAt,
          legacyClerkId: clerkId,
          legacyUsername: legacy.username ?? null,
          needsEmailUpdate: isSynthetic,
        });
      }
      ctx.userMap.set(clerkId, baId);

      counts.ok++;
      if (isSynthetic) bumpExtra(counts, "synthetic-email");
      ctx.logger({
        entity: "user",
        status: "ok",
        legacyId: clerkId,
        newId: baId,
        reason: isSynthetic ? "created with synthetic email" : "created",
      });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "user",
        status: "error",
        legacyId: clerkId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
