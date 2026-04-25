// Cria uma instituição de teste (user + organization + membership) pra
// validar o fluxo /organizacoes/entrar → /analytics. Idempotente:
//
//   - Se o user já existe, reusa.
//   - Se o user já é membro de alguma org, reusa.
//   - Se só o user existe, cria a org e associa ele como owner.
//
// Força `emailVerified: true` mesmo quando o SMTP falha no envio de
// verificação — é conta de teste, a gente quer entrar sem passar pelo fluxo
// de email.
//
// Uso:
//   pnpm --filter @lucida/api run seed:test-org
//   pnpm --filter @lucida/api run seed:test-org --email=outro@x.com --password=...
//
// Flags:
//   --email=<e>        default: contato@lucidaexam.com
//   --password=<p>     default: Tictac222
//   --org-name=<n>     default: "Lucida — Instituição de Teste"
//   --org-slug=<s>     default: lucida-teste
//   --user-name=<n>    default: "Lucida Instituição"
//
// Convenção de IDs do BA MongoDB adapter: `_id` é um ObjectId nativo; a
// `id` string exposta pela API é o hex desse ObjectId. Relacionamentos
// (member.userId, member.organizationId) também são **ObjectId nativos**
// no banco — apesar da API serializar como string hex ao sair. Este script
// sempre converte strings → ObjectId antes de escrever em campos de
// referência, senão o BA não acha o doc.

import { ObjectId, type Db } from "mongodb";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import { createAuth } from "../../src/domains/iam/infrastructure/better-auth/auth.js";

interface Args {
  email: string;
  password: string;
  orgName: string;
  orgSlug: string;
  userName: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    email: "contato@lucidaexam.com",
    password: "Tictac222",
    orgName: "Lucida — Instituição de Teste",
    orgSlug: "lucida-teste",
    userName: "Lucida Instituição",
  };
  for (const arg of argv) {
    if (arg.startsWith("--email=")) out.email = arg.slice("--email=".length);
    else if (arg.startsWith("--password=")) out.password = arg.slice("--password=".length);
    else if (arg.startsWith("--org-name=")) out.orgName = arg.slice("--org-name=".length);
    else if (arg.startsWith("--org-slug=")) out.orgSlug = arg.slice("--org-slug=".length);
    else if (arg.startsWith("--user-name=")) out.userName = arg.slice("--user-name=".length);
  }
  return out;
}

/**
 * Limpa docs de member/org criados por versões anteriores (buggy) deste
 * script. Dois formatos ruins que precisam sumir:
 *
 *   1. `_id` em formato UUID string — vem da v1 do script (antes de usar
 *      ObjectId). Fácil de detectar: hex de 24 chars ≠ UUID com hifens.
 *   2. `userId`/`organizationId` como STRING em vez de ObjectId — vem da v2.
 *      O BA só encontra docs onde esses campos são ObjectIds, então strings
 *      ficam "órfãs" (invisíveis ao plugin organization).
 *
 * A função busca por ambas as variantes (query por string OU por ObjectId)
 * e remove membership + org associadas quando encontrar.
 */
async function cleanupInconsistentDocs(db: Db, userId: string): Promise<void> {
  const members = db.collection("member");
  const orgs = db.collection("organization");
  const isObjectIdHex = /^[0-9a-f]{24}$/i;

  // Query por string userId pega as v1 (UUID _id) e v2 (userId stringificado).
  const badMembers = await members.find({ userId }).toArray();
  for (const m of badMembers) {
    const memberIdStr = String(m._id);
    const orgIdStr = String(m.organizationId);
    const memberIdIsUuid = !isObjectIdHex.test(memberIdStr);
    const orgIdIsUuid = !isObjectIdHex.test(orgIdStr);
    const userIdIsString = typeof m.userId === "string";

    if (!memberIdIsUuid && !orgIdIsUuid && !userIdIsString) continue;

    // Delete org if its id is a valid ObjectId hex; senão deleta por string.
    const orgIdQuery = isObjectIdHex.test(orgIdStr)
      ? new ObjectId(orgIdStr)
      : (m.organizationId as unknown as never);
    await orgs.deleteOne({ _id: orgIdQuery as never });

    // Delete member by its _id (regardless of format).
    await members.deleteOne({ _id: m._id as unknown as never });

    console.log(
      `[cleanup] removed legacy docs — member=${memberIdStr} org=${orgIdStr}` +
        (userIdIsString ? " (userId was string)" : ""),
    );
  }
}

async function ensureUser(
  auth: ReturnType<typeof createAuth>,
  db: Db,
  args: Args,
): Promise<string> {
  const users = db.collection("user");
  const existing = await users.findOne({ email: args.email });
  if (existing) {
    console.log(`[skip] user already exists: ${String(existing._id)} (${args.email})`);
    return String(existing._id);
  }

  console.log(`[create] signing up user ${args.email}...`);
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: args.email,
        password: args.password,
        name: args.userName,
      },
    });
    console.log(`[ok] user created: ${result.user.id}`);
    return result.user.id;
  } catch (err) {
    // `sendOnSignUp: true` tenta mandar email de verificação. Se o SMTP
    // falhar a gente ainda pode ter o user no banco — tenta achar por email.
    const fallback = await users.findOne({ email: args.email });
    if (fallback) {
      console.warn(
        `[warn] signUpEmail threw (${err instanceof Error ? err.message : err}), ` +
          `mas user foi criado: ${String(fallback._id)}`,
      );
      return String(fallback._id);
    }
    throw new Error(
      `signUpEmail failed and user was not persisted: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function ensureEmailVerified(db: Db, userId: string): Promise<void> {
  const res = await db.collection("user").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        emailVerified: true,
        needsEmailUpdate: false,
        updatedAt: new Date(),
      },
    },
  );
  if (res.matchedCount === 0) {
    throw new Error(`user ${userId} not found when forcing emailVerified`);
  }
  console.log(
    `[ok] forced emailVerified=true on user ${userId} (modified=${res.modifiedCount})`,
  );
}

async function ensureBillingSettings(
  db: Db,
  organizationId: string,
): Promise<void> {
  const col = db.collection("organization_billing_settings");
  const existing = await col.findOne({ _id: organizationId as unknown as never });
  if (existing) {
    console.log(
      `[skip] billing settings já existem pra org ${organizationId} (billingMode=${existing.billingMode})`,
    );
    return;
  }
  const now = new Date();
  await col.insertOne({
    _id: organizationId as unknown as never,
    organizationId,
    billingMode: "pool",
    perTeacherLimit: null,
    billingCycle: null,
    stripeSubscriptionId: null,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[ok] billing settings criadas pra org ${organizationId} (pool)`);
}

async function ensureOrganization(
  db: Db,
  userId: string,
  args: Args,
): Promise<{ orgId: string; slug: string; created: boolean }> {
  const orgs = db.collection("organization");
  const members = db.collection("member");
  const userObjectId = new ObjectId(userId);

  // User já pertence a alguma org? Reusa. Query por ObjectId — é como o BA
  // escreve userId nos docs que ele cria. (Strings são resquício de seed
  // antigo; a função de cleanup removeu antes de chegar aqui.)
  const existingMember = await members.findOne({ userId: userObjectId });
  if (existingMember) {
    const orgIdStr = String(existingMember.organizationId);
    const org = await orgs.findOne({ _id: new ObjectId(orgIdStr) });
    const slug = (org?.slug as string | undefined) ?? "(desconhecido)";
    console.log(
      `[skip] user ${userId} já é ${existingMember.role} da org ${orgIdStr} (${slug})`,
    );
    return { orgId: orgIdStr, slug, created: false };
  }

  // Slug livre?
  const slugTaken = await orgs.findOne({ slug: args.orgSlug });
  if (slugTaken) {
    throw new Error(
      `slug "${args.orgSlug}" já pertence à org ${String(slugTaken._id)}, ` +
        `mas o user ${userId} não é membro dela. ` +
        `Rode com --org-slug=outro-slug ou ajuste manualmente.`,
    );
  }

  const orgObjectId = new ObjectId();
  const memberObjectId = new ObjectId();
  const now = new Date();

  await orgs.insertOne({
    _id: orgObjectId,
    name: args.orgName,
    slug: args.orgSlug,
    createdAt: now,
  });
  const orgId = orgObjectId.toHexString();
  console.log(`[ok] org criada: ${orgId} (${args.orgSlug})`);

  // ATENÇÃO: userId e organizationId são ObjectId no banco, não strings.
  // O BA organization plugin busca por `{ userId: <ObjectId> }`, então se
  // guardarmos strings, `organization.list` devolve vazio e o fluxo
  // /analytics nunca enxerga a membership.
  await members.insertOne({
    _id: memberObjectId,
    organizationId: orgObjectId,
    userId: userObjectId,
    role: "owner",
    createdAt: now,
  });
  console.log(`[ok] user ${userId} adicionado como owner`);

  return { orgId, slug: args.orgSlug, created: true };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const db = await getAuthDb(env.MONGODB_URI);
  const auth = createAuth(db);

  const userId = await ensureUser(auth, db, args);
  await ensureEmailVerified(db, userId);
  await cleanupInconsistentDocs(db, userId);
  const { orgId, slug, created } = await ensureOrganization(db, userId, args);
  await ensureBillingSettings(db, orgId);

  console.log(`
═══════════════ INSTITUIÇÃO DE TESTE ═══════════════
  email:    ${args.email}
  senha:    ${args.password}
  user id:  ${userId}
  org id:   ${orgId}
  org slug: ${slug}
  role:     owner
  status:   ${created ? "criada agora" : "já existia (reusada)"}

  Entrar em:
    ${env.WEB_ORIGIN}/organizacoes/entrar
═════════════════════════════════════════════════════
`);
}

main()
  .then(async () => {
    await closeAuthDb();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    await closeAuthDb();
    process.exit(1);
  });
