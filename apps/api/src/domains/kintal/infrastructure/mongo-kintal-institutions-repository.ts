import { ObjectId, type Db, type Filter } from "mongodb";
import { CreditWalletModel } from "@/domains/billing/infrastructure/wallet-schema.js";
import { LedgerEntryModel } from "@/domains/billing/infrastructure/ledger-schema.js";
import { OrganizationBillingSettingsModel } from "@/domains/billing/infrastructure/organization-billing-settings-schema.js";
import { ExamModel } from "@/domains/exam/infrastructure/exam-schema.js";
import type { OrgBillingMode } from "@/domains/billing/domain/billing-mode.js";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import type {
  AddInstitutionMemberByUserIdInput,
  AddInstitutionMemberInput,
  AddInstitutionMemberResult,
  CreateInstitutionInput,
  CreateInstitutionResult,
  KintalInstitutionDetail,
  KintalInstitutionLedgerEntry,
  KintalInstitutionListItem,
  KintalInstitutionMember,
  KintalInstitutionUsage,
  KintalInstitutionWalletBreakdown,
  KintalInstitutionsRepository,
  ListKintalInstitutionsFilter,
  RemoveInstitutionMemberInput,
} from "../application/ports/kintal-institutions-repository.js";
import {
  CannotRemoveInstitutionOwnerError,
  InstitutionNotFoundError,
  InstitutionSlugTakenError,
  InvalidInstitutionInputError,
  MemberMissingSignupDataError,
  MembershipNotFoundError,
  OwnerAlreadyInOrganizationError,
  UserAlreadyInOrganizationError,
  UserAlreadyMemberError,
} from "../domain/institutions-errors.js";

interface OrganizationDoc {
  _id: ObjectId;
  name?: string;
  slug?: string;
  createdAt?: Date;
  /** Soft delete — adicionado por este módulo, BA ignora. */
  archivedAt?: Date | null;
}

/**
 * Users e memberships podem ter `_id`/`userId` em dois formatos:
 * - ObjectId nativo (default do mongodbAdapter do BetterAuth).
 * - string custom (users migrados do Clerk preservaram o id legado).
 *
 * Tipamos como união pra refletir o que vem do banco e evitar coerção
 * cega via `new ObjectId(x)` — que estoura BSONError quando x não é
 * hex de 24 caracteres.
 */
type BaId = ObjectId | string;

interface MemberDoc {
  _id: BaId;
  organizationId: BaId;
  userId: BaId;
  role?: "owner" | "admin" | "member";
  createdAt?: Date;
}

interface UserDoc {
  _id: BaId;
  name?: string | null;
  email?: string;
}

interface WalletAggRow {
  _id: string;
  total: number;
}

const RECENT_LEDGER_LIMIT = 25;
const USAGE_WINDOW_DAYS = 30;

/**
 * Read + write das instituições no Kintal.
 *
 * BetterAuth roda no `authDb` (driver nativo). Mongoose models de billing
 * vivem na conexão default — junções são feitas em JS porque os DBs podem
 * ser distintos, então `$lookup` cross-DB não é opção.
 */
export class MongoKintalInstitutionsRepository
  implements KintalInstitutionsRepository
{
  constructor(
    private readonly authDb: Db,
    private readonly auth: Auth,
  ) {}

  private get organizations() {
    return this.authDb.collection<OrganizationDoc>("organization");
  }
  private get members() {
    return this.authDb.collection<MemberDoc>("member");
  }
  private get users() {
    return this.authDb.collection<UserDoc>("user");
  }

  // ─── list ────────────────────────────────────────────────────────────

  async list(
    filter: ListKintalInstitutionsFilter,
  ): Promise<KintalInstitutionListItem[]> {
    const limit = Math.min(filter.limit ?? 50, 200);
    const mongoFilter: Filter<OrganizationDoc> = {};

    const archived = filter.archived ?? "active";
    if (archived === "active") {
      mongoFilter.archivedAt = { $in: [null, undefined] };
    } else if (archived === "archived") {
      mongoFilter.archivedAt = { $type: "date" };
    }

    if (filter.q) {
      const safe = escapeRegex(filter.q);
      mongoFilter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { slug: { $regex: safe, $options: "i" } },
      ];
    }
    if (filter.before) {
      mongoFilter.createdAt = { $lt: filter.before };
    }

    const orgs = await this.organizations
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (orgs.length === 0) return [];

    const orgIds = orgs.map((o) => String(o._id));

    const [memberDocs, settingsByOrg, balancesByOrg] = await Promise.all([
      this.members.find({ organizationId: { $in: orgs.map((o) => o._id) } }).toArray(),
      fetchSettingsMap(orgIds),
      fetchActiveBalanceMap(orgIds),
    ]);

    // Indexa membros: orgId → { count, ownerUserId? }
    const memberStats = new Map<
      string,
      { count: number; ownerUserId: string | null }
    >();
    for (const m of memberDocs) {
      const orgId = String(m.organizationId);
      const cur = memberStats.get(orgId) ?? { count: 0, ownerUserId: null };
      cur.count += 1;
      if (m.role === "owner" && !cur.ownerUserId) {
        cur.ownerUserId = String(m.userId);
      }
      memberStats.set(orgId, cur);
    }

    const ownerIds = Array.from(memberStats.values())
      .map((s) => s.ownerUserId)
      .filter((id): id is string => Boolean(id));
    const ownerMap = await fetchUsersMap(this.authDb, ownerIds);

    return orgs.map<KintalInstitutionListItem>((org) => {
      const orgId = String(org._id);
      const stats = memberStats.get(orgId) ?? { count: 0, ownerUserId: null };
      const owner = stats.ownerUserId
        ? ownerMap.get(stats.ownerUserId) ?? null
        : null;
      return {
        id: orgId,
        name: org.name ?? "Sem nome",
        slug: org.slug ?? null,
        createdAt: org.createdAt ?? new Date(0),
        archivedAt: org.archivedAt ?? null,
        billingMode: settingsByOrg.get(orgId)?.billingMode ?? null,
        creditBalance: balancesByOrg.get(orgId) ?? 0,
        owner: owner
          ? { id: owner.id, name: owner.name, email: owner.email }
          : null,
        membersCount: stats.count,
      };
    });
  }

  // ─── findById ────────────────────────────────────────────────────────

  async findById(orgId: string): Promise<KintalInstitutionDetail | null> {
    const oid = tryObjectId(orgId);
    if (!oid) return null;
    const org = await this.organizations.findOne({ _id: oid });
    if (!org) return null;

    const memberDocs = await this.members
      .find({ organizationId: oid })
      .toArray();
    const memberUserIds = memberDocs.map((m) => String(m.userId));

    const [settings, walletDocs, ledgerDocs, usage] = await Promise.all([
      OrganizationBillingSettingsModel.findOne({ organizationId: orgId })
        .lean()
        .exec(),
      CreditWalletModel.find({
        ownerId: orgId,
        scope: "org",
        balance: { $gt: 0 },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
      LedgerEntryModel.find({ ownerId: orgId, scope: "org" })
        .sort({ createdAt: -1 })
        .limit(RECENT_LEDGER_LIMIT)
        .lean()
        .exec(),
      computeUsage(orgId, memberUserIds),
    ]);

    const userIds = memberDocs.map((m) => String(m.userId));
    const userMap = await fetchUsersMap(this.authDb, userIds);

    const members: KintalInstitutionMember[] = memberDocs
      .map<KintalInstitutionMember>((m) => {
        const u = userMap.get(String(m.userId));
        return {
          id: String(m.userId),
          name: u?.name ?? null,
          email: u?.email ?? "",
          role: m.role ?? "member",
          joinedAt: m.createdAt ?? new Date(),
        };
      })
      .sort((a, b) => roleRank(a.role) - roleRank(b.role));

    const owner = members.find((m) => m.role === "owner") ?? null;
    const balance = walletDocs.reduce(
      (sum: number, w) => sum + (w.balance ?? 0),
      0,
    );

    const walletBreakdown: KintalInstitutionWalletBreakdown[] = walletDocs.map(
      (w) => ({
        walletId: String(w._id),
        source: w.source,
        balance: w.balance ?? 0,
        expiresAt: w.expiresAt ?? null,
        createdAt: w.createdAt ?? new Date(),
      }),
    );

    const recentLedger: KintalInstitutionLedgerEntry[] = ledgerDocs.map(
      (d) => ({
        id: String(d._id),
        type: d.type,
        amount: d.amount,
        reason: d.reason,
        walletSource: d.walletSource,
        actorUserId: d.actorUserId ?? null,
        relatedAction: d.relatedAction ?? null,
        createdAt: d.createdAt ?? new Date(),
      }),
    );

    return {
      id: orgId,
      name: org.name ?? "Sem nome",
      slug: org.slug ?? null,
      createdAt: org.createdAt ?? new Date(0),
      archivedAt: org.archivedAt ?? null,
      billingMode: (settings?.billingMode as OrgBillingMode | undefined) ?? null,
      creditBalance: balance,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      membersCount: members.length,
      perTeacherLimit: settings?.perTeacherLimit ?? null,
      stripeSubscriptionId: settings?.stripeSubscriptionId ?? null,
      members,
      walletBreakdown,
      recentLedger,
      usage,
    };
  }

  // ─── create ──────────────────────────────────────────────────────────

  async create(
    input: CreateInstitutionInput,
  ): Promise<CreateInstitutionResult> {
    // Pré-checks rápidos antes de tocar em qualquer write — evita deixá-lo
    // a meio caminho num cenário trivial.
    const slugTaken = await this.organizations.findOne({ slug: input.orgSlug });
    if (slugTaken) {
      throw new InstitutionSlugTakenError(input.orgSlug);
    }

    // 1. Resolve o owner: reusa user existente sem org, ou cria um novo.
    //    `ownerId` é mantido no formato nativo do banco (ObjectId ou
    //    string Clerk legacy) — não tentamos `new ObjectId(...)` porque
    //    users migrados podem ter id custom.
    const existingUser = await this.users.findOne({ email: input.ownerEmail });
    let ownerId: BaId;
    let ownerExisted: boolean;
    if (existingUser) {
      const hasOrg = await this.userHasMembership(existingUser._id);
      if (hasOrg) {
        throw new OwnerAlreadyInOrganizationError(input.ownerEmail);
      }
      ownerId = existingUser._id;
      ownerExisted = true;
    } else {
      if (!input.ownerPassword || input.ownerPassword.length < 8) {
        throw new InvalidInstitutionInputError(
          "Senha precisa ter pelo menos 8 caracteres para criar o owner.",
        );
      }
      ownerId = await this.signUpUser({
        email: input.ownerEmail,
        name: input.ownerName,
        password: input.ownerPassword,
      });
      ownerExisted = false;
    }

    // 2. Força emailVerified=true — staff cria/vincula com dados definitivos.
    await this.users.updateOne(
      { _id: ownerId },
      {
        $set: {
          emailVerified: true,
          needsEmailUpdate: false,
          updatedAt: new Date(),
        },
      },
    );

    // 3. Cria org + membership owner.
    const orgOid = new ObjectId();
    const memberOid = new ObjectId();
    const now = new Date();
    await this.organizations.insertOne({
      _id: orgOid,
      name: input.orgName,
      slug: input.orgSlug,
      createdAt: now,
      archivedAt: null,
    });
    await this.members.insertOne({
      _id: memberOid,
      organizationId: orgOid,
      userId: ownerId,
      role: "owner",
      createdAt: now,
    });

    // 4. Cria billing settings com o modo escolhido.
    const orgIdHex = orgOid.toHexString();
    await OrganizationBillingSettingsModel.updateOne(
      { _id: orgIdHex },
      {
        $set: {
          organizationId: orgIdHex,
          billingMode: input.billingMode,
          perTeacherLimit: null,
          billingCycle: null,
          stripeSubscriptionId: null,
        },
        $setOnInsert: { _id: orgIdHex },
      },
      { upsert: true },
    );

    return {
      organizationId: orgIdHex,
      ownerUserId: String(ownerId),
      ownerExisted,
    };
  }

  // ─── members (add / remove via Kintal) ───────────────────────────────

  async addMember(
    input: AddInstitutionMemberInput,
  ): Promise<AddInstitutionMemberResult> {
    const orgOid = parseOrgId(input.organizationId);
    const orgExists = await this.organizations.findOne({ _id: orgOid });
    if (!orgExists) throw new InstitutionNotFoundError();

    const existingUser = await this.users.findOne({
      email: input.userEmail,
    });

    let userId: BaId;
    let userExisted: boolean;
    if (existingUser) {
      // Regra "1 user = 1 org" — se já tem alguma membership, recusa
      // (independente de qual org, mantém a regra global).
      const hasOrg = await this.userHasMembership(existingUser._id);
      if (hasOrg) {
        throw new OwnerAlreadyInOrganizationError(input.userEmail);
      }
      userId = existingUser._id;
      userExisted = true;
    } else {
      if (
        !input.userName ||
        input.userName.trim().length === 0 ||
        !input.password ||
        input.password.length < 8
      ) {
        throw new MemberMissingSignupDataError();
      }
      userId = await this.signUpUser({
        email: input.userEmail,
        name: input.userName,
        password: input.password,
      });
      userExisted = false;
    }

    await this.users.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerified: true,
          needsEmailUpdate: false,
          updatedAt: new Date(),
        },
      },
    );

    await this.members.insertOne({
      _id: new ObjectId(),
      organizationId: orgOid,
      userId,
      role: input.role,
      createdAt: new Date(),
    });

    return { userId: String(userId), userExisted };
  }

  async addMemberByUserId(
    input: AddInstitutionMemberByUserIdInput,
  ): Promise<void> {
    const orgOid = parseOrgId(input.organizationId);

    const orgExists = await this.organizations.findOne({ _id: orgOid });
    if (!orgExists) throw new InstitutionNotFoundError();

    const user = await this.findUserByPublicId(input.userId);
    if (!user) {
      throw new InvalidInstitutionInputError("Usuário não encontrado.");
    }

    const hasOrg = await this.userHasMembership(user._id);
    if (hasOrg) {
      // Diferencia mensagem: se já é membro DESTA org → UserAlreadyMember;
      // se é membro de OUTRA → UserAlreadyInOrganization.
      const sameOrg = await this.members.findOne({
        organizationId: orgOid,
        userId: user._id,
      });
      if (sameOrg) throw new UserAlreadyMemberError();
      throw new UserAlreadyInOrganizationError();
    }

    await this.members.insertOne({
      _id: new ObjectId(),
      organizationId: orgOid,
      userId: user._id,
      role: input.role,
      createdAt: new Date(),
    });
  }

  async removeMember(input: RemoveInstitutionMemberInput): Promise<void> {
    const orgOid = parseOrgId(input.organizationId);
    const user = await this.findUserByPublicId(input.userId);
    if (!user) throw new MembershipNotFoundError();
    const membership = await this.members.findOne({
      organizationId: orgOid,
      userId: user._id,
    });
    if (!membership) throw new MembershipNotFoundError();
    if (membership.role === "owner") {
      throw new CannotRemoveInstitutionOwnerError();
    }
    await this.members.deleteOne({ _id: membership._id });
  }

  // ─── helpers ─────────────────────────────────────────────────────────

  /**
   * Busca um user pelo id em string vindo do path/HTTP. Tenta tanto
   * ObjectId (formato BA padrão) quanto string crua (legacy Clerk).
   * Retorna o doc com `_id` no formato real do banco.
   */
  private async findUserByPublicId(idStr: string): Promise<UserDoc | null> {
    const candidates: BaId[] = [idStr];
    const oid = tryObjectId(idStr);
    if (oid) candidates.push(oid);
    return this.users.findOne({ _id: { $in: candidates } });
  }

  private async userHasMembership(userId: BaId): Promise<boolean> {
    const found = await this.members.findOne({ userId });
    return found !== null;
  }

  /**
   * Cria user via BetterAuth signUp e retorna o `_id` no formato real
   * armazenado no banco (ObjectId pelo mongodbAdapter padrão). Mantém
   * o fallback do seed:test-org — se SMTP falhar no envio de verificação,
   * o user já foi persistido, então buscamos pelo email.
   */
  private async signUpUser(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<BaId> {
    try {
      await this.auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
        },
      });
    } catch (err) {
      // Não retornamos `result.user.id` direto pra evitar coerção
      // (vem como string mesmo quando o doc tem ObjectId nativo).
      const fallback = await this.users.findOne({ email: input.email });
      if (fallback) return fallback._id;
      throw new Error(
        `Falha ao criar usuário: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const fresh = await this.users.findOne({ email: input.email });
    if (!fresh) {
      throw new Error("Falha ao localizar usuário recém-criado.");
    }
    return fresh._id;
  }

  // ─── archive / unarchive ─────────────────────────────────────────────

  async archive(orgId: string): Promise<void> {
    const oid = tryObjectId(orgId);
    if (!oid) return;
    await this.organizations.updateOne(
      { _id: oid },
      { $set: { archivedAt: new Date() } },
    );
  }

  async unarchive(orgId: string): Promise<void> {
    const oid = tryObjectId(orgId);
    if (!oid) return;
    await this.organizations.updateOne(
      { _id: oid },
      { $set: { archivedAt: null } },
    );
  }

  async exists(orgId: string): Promise<boolean> {
    const oid = tryObjectId(orgId);
    if (!oid) return false;
    const doc = await this.organizations.findOne(
      { _id: oid },
      { projection: { _id: 1 } },
    );
    return Boolean(doc);
  }
}

// ─── helpers de leitura ──────────────────────────────────────────────────

async function fetchSettingsMap(
  orgIds: string[],
): Promise<Map<string, { billingMode: OrgBillingMode }>> {
  if (orgIds.length === 0) return new Map();
  const docs = await OrganizationBillingSettingsModel.find({
    organizationId: { $in: orgIds },
  })
    .select({ organizationId: 1, billingMode: 1 })
    .lean()
    .exec();
  return new Map(
    docs.map((d) => [
      d.organizationId,
      { billingMode: d.billingMode as OrgBillingMode },
    ]),
  );
}

async function fetchActiveBalanceMap(
  orgIds: string[],
): Promise<Map<string, number>> {
  if (orgIds.length === 0) return new Map();
  const rows = (await CreditWalletModel.aggregate([
    {
      $match: {
        scope: "org",
        ownerId: { $in: orgIds },
        balance: { $gt: 0 },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    },
    { $group: { _id: "$ownerId", total: { $sum: "$balance" } } },
  ]).exec()) as WalletAggRow[];
  return new Map(rows.map((r) => [r._id, r.total]));
}

async function fetchUsersMap(
  authDb: Db,
  userIds: string[],
): Promise<Map<string, { id: string; name: string | null; email: string }>> {
  if (userIds.length === 0) return new Map();
  // BA grava `_id` como ObjectId nativo OU como string custom (UUIDs no
  // signup atual + ids legados do Clerk). Filtrar só por ObjectId perde
  // todos os UUIDs — precisamos consultar pelos dois formatos.
  const candidates: BaId[] = [];
  for (const id of userIds) {
    candidates.push(id);
    const oid = tryObjectId(id);
    if (oid) candidates.push(oid);
  }
  const docs = await authDb
    .collection<UserDoc>("user")
    .find({ _id: { $in: candidates } })
    .project<UserDoc>({ name: 1, email: 1 })
    .toArray();
  return new Map(
    docs.map((u) => [
      String(u._id),
      { id: String(u._id), name: u.name ?? null, email: u.email ?? "" },
    ]),
  );
}

/**
 * Computa consumo (créditos + provas) do scope=org na janela
 * [now - 30d, now] e total vitalício.
 */
async function computeUsage(
  orgId: string,
  memberUserIds: string[],
): Promise<KintalInstitutionUsage> {
  const now = new Date();
  const windowFrom = new Date(now);
  windowFrom.setUTCDate(windowFrom.getUTCDate() - USAGE_WINDOW_DAYS);

  const [windowAgg, lifetimeAgg, examsGenerated] = await Promise.all([
    LedgerEntryModel.aggregate([
      {
        $match: {
          ownerId: orgId,
          scope: "org",
          type: "debit",
          reason: "ai_consumption",
          createdAt: { $gte: windowFrom, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).exec(),
    LedgerEntryModel.aggregate([
      {
        $match: {
          ownerId: orgId,
          scope: "org",
          type: "debit",
          reason: "ai_consumption",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).exec(),
    memberUserIds.length === 0
      ? Promise.resolve(0)
      : ExamModel.countDocuments({
          createdBy: { $in: memberUserIds },
          createdAt: { $gte: windowFrom, $lte: now },
        }).exec(),
  ]);

  const creditsConsumed =
    (windowAgg as Array<{ total: number }>)[0]?.total ?? 0;
  const lifetimeCreditsConsumed =
    (lifetimeAgg as Array<{ total: number }>)[0]?.total ?? 0;

  return {
    windowFrom,
    windowTo: now,
    creditsConsumed,
    examsGenerated,
    lifetimeCreditsConsumed,
  };
}

function roleRank(r: "owner" | "admin" | "member"): number {
  if (r === "owner") return 0;
  if (r === "admin") return 1;
  return 2;
}

function tryObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function parseOrgId(value: string): ObjectId {
  const oid = tryObjectId(value);
  if (!oid) throw new InstitutionNotFoundError();
  return oid;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
