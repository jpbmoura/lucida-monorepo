import { ObjectId, type Db, type Filter } from "mongodb";
import { CreditWalletModel } from "@/domains/billing/infrastructure/wallet-schema.js";
import { LedgerEntryModel } from "@/domains/billing/infrastructure/ledger-schema.js";
import { SubscriptionModel } from "@/domains/billing/infrastructure/subscription-schema.js";
import type { CreditSource } from "@/domains/billing/domain/credit-source.js";
import { PLANS, type PlanId } from "@/domains/billing/domain/plan.js";
import { isTopupId, TOPUPS } from "@/domains/billing/domain/topup.js";
import { ClassModel } from "@/domains/class/infrastructure/class-schema.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";
import { ExamModel } from "@/domains/exam/infrastructure/exam-schema.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import type {
  KintalRecentLedgerEntry,
  KintalSubscriptionHistoryItem,
  KintalUserBilling,
  KintalUserDetail,
  KintalUserEngagement,
  KintalUserListItem,
  KintalUserOrgInfo,
  KintalUsersRepository,
  ListKintalUsersFilter,
  ListKintalUsersResult,
  SubscriptionStatus,
} from "../application/ports/kintal-users-repository.js";

interface BaUserDoc {
  _id: unknown;
  id?: string;
  name: string | null;
  email: string;
  emailVerified?: boolean;
  image: string | null;
  banned?: boolean | null;
  role?: string | null;
  whatsapp?: string | null;
  institutionType?: string | null;
  stateUf?: string | null;
  studentsRange?: string | null;
  teachingYears?: string | null;
  acquisitionChannel?: string | null;
  gender?: string | null;
  teachingLevels?: string[] | null;
  subjects?: string[] | null;
  staffSince?: Date | null;
  legacyClerkId?: string | null;
  needsEmailUpdate?: boolean | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

interface ActiveSubscriptionRow {
  ownerId: string;
  planId: string;
  status: SubscriptionStatus;
}

interface WalletAggRow {
  _id: string; // ownerId
  total: number;
}

interface WalletDetailRow {
  _id: string;
  ownerId: string;
  source: CreditSource;
  balance: number;
  expiresAt: Date | null;
}

/**
 * Lê dados consolidados de usuários pro Kintal — junta `user` (BA, driver
 * nativo) com `subscriptions` e `credit_wallets` (Mongoose). A junção é feita
 * em JS porque BA roda em DB próprio (authDb) e Mongoose roda na conexão
 * principal — não dá pra usar $lookup cross-DB.
 */
export class MongoKintalUsersRepository implements KintalUsersRepository {
  constructor(private readonly authDb: Db) {}

  private get users() {
    return this.authDb.collection("user");
  }

  async list(
    filter: ListKintalUsersFilter,
  ): Promise<ListKintalUsersResult> {
    const pageSize = clampPageSize(filter.pageSize);
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const skip = (page - 1) * pageSize;

    const mongoFilter: Filter<Record<string, unknown>> = {};
    if (filter.q) {
      const safe = escapeRegex(filter.q);
      mongoFilter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ];
    }
    if (filter.role === "staff") {
      mongoFilter.role = "staff";
    } else if (filter.role === "user") {
      mongoFilter.role = { $ne: "staff" };
    }
    if (filter.createdAfter) {
      mongoFilter.createdAt = { $gte: filter.createdAfter };
    }

    // Pré-filtragem por subscription: como `subscriptions` vive num DB
    // diferente do `user` (BA), não podemos $lookup. Estratégia: buscar
    // os ownerIds que batem com o filtro de assinatura primeiro, depois
    // restringir o `users.find` por `_id IN/NIN`. Permite skip+limit +
    // count exatos (vs filtragem em-memória que destruía paginação).
    if (filter.subscription && filter.subscription !== "any") {
      const ownerIdsForSubFilter = await fetchOwnerIdsForSubscription(
        filter.subscription,
      );
      const oids = ownerIdsToObjectIds(ownerIdsForSubFilter);

      if (filter.subscription === "without") {
        // Sem assinatura ativa = NOT IN (active|past_due). Curtos os ativos
        // (poucos milhares no máximo), `$nin` é viável.
        if (oids.length > 0) mongoFilter._id = { $nin: oids };
      } else {
        // Status específico — IN. Se a lista estiver vazia, retorna nada.
        if (oids.length === 0) {
          return { items: [], total: 0, hasMore: false };
        }
        mongoFilter._id = { $in: oids };
      }
    }

    const usersCollection = this.users;
    const [rows, total] = await Promise.all([
      usersCollection
        .find(mongoFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray() as unknown as Promise<BaUserDoc[]>,
      usersCollection.countDocuments(mongoFilter),
    ]);

    if (rows.length === 0) {
      return { items: [], total, hasMore: false };
    }

    const ownerIds = rows.map((r) => baUserId(r));
    const [subs, wallets] = await Promise.all([
      fetchActiveSubscriptions(ownerIds),
      fetchActiveWalletTotals(ownerIds),
    ]);

    const subByOwner = new Map(subs.map((s) => [s.ownerId, s]));
    const balByOwner = new Map(wallets.map((w) => [w._id, w.total]));

    const items = rows.map<KintalUserListItem>((r) => {
      const id = baUserId(r);
      const sub = subByOwner.get(id) ?? null;
      return {
        id,
        name: r.name ?? null,
        email: r.email,
        image: r.image ?? null,
        role: r.role ?? null,
        whatsapp: r.whatsapp ?? null,
        institutionType: r.institutionType ?? null,
        stateUf: r.stateUf ?? null,
        createdAt: r.createdAt,
        creditBalance: balByOwner.get(id) ?? 0,
        subscription: sub
          ? { planId: sub.planId, status: sub.status }
          : null,
      };
    });

    return {
      items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async findById(userId: string): Promise<KintalUserDetail | null> {
    const row = await findOneByPrimaryId(this.users, userId);
    if (!row) return null;

    const id = baUserId(row);

    // Fan-out: 9 queries em paralelo. Aceitável aqui porque é uma página
    // admin de baixo volume — ninguém abre 1k/s. As mais "pesadas" (subs
    // history + wallets all + ledger lifetime) são pré-condição pra computar
    // LTV — não dá pra atrasar.
    const [
      activeSubs,
      activeWalletDocs,
      allWalletsForUser,
      allSubsForUser,
      classesCount,
      studentsCount,
      examIds,
      submissionStats,
      ledgerLifetime,
      recentLedger,
      orgs,
    ] = await Promise.all([
      fetchActiveSubscriptions([id]),
      fetchActiveWalletDetails(id),
      fetchAllWalletsForOwner(id),
      fetchAllSubscriptionsForOwner(id),
      ClassModel.countDocuments({ ownerId: id }).exec(),
      StudentModel.countDocuments({ ownerId: id }).exec(),
      fetchExamIdsAndCount(id),
      fetchSubmissionStats(id),
      fetchLifetimeLedgerAggregate(id),
      fetchRecentLedger(id, 30),
      fetchUserOrganizations(this.authDb, id),
    ]);

    const totalBalance = activeWalletDocs.reduce(
      (sum, w) => sum + w.balance,
      0,
    );
    const sub = activeSubs[0] ?? null;

    const engagement = computeEngagement({
      classesCount,
      studentsCount,
      examsCount: examIds.count,
      lastExamCreatedAt: examIds.lastCreatedAt,
      submissionStats,
      lifetimeAi: ledgerLifetime,
    });

    const billing = computeBilling({
      allSubs: allSubsForUser,
      allWallets: allWalletsForUser,
      lifetimeLedger: ledgerLifetime,
    });

    return {
      id,
      name: row.name ?? null,
      email: row.email,
      image: row.image ?? null,
      role: row.role ?? null,
      emailVerified: Boolean(row.emailVerified),
      banned: row.banned ?? null,
      whatsapp: row.whatsapp ?? null,
      institutionType: row.institutionType ?? null,
      stateUf: row.stateUf ?? null,
      studentsRange: row.studentsRange ?? null,
      teachingYears: row.teachingYears ?? null,
      acquisitionChannel: row.acquisitionChannel ?? null,
      gender: row.gender ?? null,
      teachingLevels: row.teachingLevels ?? [],
      subjects: row.subjects ?? [],
      staffSince: row.staffSince ?? null,
      legacyClerkId: row.legacyClerkId ?? null,
      needsEmailUpdate: row.needsEmailUpdate ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? null,
      creditBalance: totalBalance,
      walletBreakdown: activeWalletDocs.map((w) => ({
        source: w.source,
        balance: w.balance,
        expiresAt: w.expiresAt,
      })),
      subscription: sub
        ? { planId: sub.planId, status: sub.status }
        : null,
      engagement,
      billing,
      recentLedger,
      organizations: orgs,
    };
  }

  async update(
    userId: string,
    patch: Parameters<KintalUsersRepository["update"]>[1],
  ): Promise<void> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    const unset: Record<string, ""> = {};

    function apply(key: string, value: string | null | undefined) {
      if (value === undefined) return;
      if (value === null || value === "") {
        unset[key] = "";
      } else {
        set[key] = value;
      }
    }

    if (patch.name !== undefined && patch.name.trim()) {
      set.name = patch.name.trim();
    }
    apply("whatsapp", patch.whatsapp);
    apply("institutionType", patch.institutionType);
    apply("stateUf", patch.stateUf);
    apply("studentsRange", patch.studentsRange);
    apply("teachingYears", patch.teachingYears);
    apply("acquisitionChannel", patch.acquisitionChannel);

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    await this.users.updateOne(
      { _id: new ObjectId(userId) } as unknown as Filter<Record<string, unknown>>,
      update,
    );
  }
}

// ───── helpers ──────────────────────────────────────────────────

function baUserId(row: BaUserDoc): string {
  return row.id ?? String(row._id);
}

async function findOneByPrimaryId(
  collection: ReturnType<Db["collection"]>,
  userId: string,
): Promise<BaUserDoc | null> {
  return (await collection.findOne({
    _id: new ObjectId(userId),
  } as unknown as Filter<Record<string, unknown>>)) as unknown as BaUserDoc | null;
}

async function fetchActiveSubscriptions(
  ownerIds: string[],
): Promise<ActiveSubscriptionRow[]> {
  if (ownerIds.length === 0) return [];
  const docs = await SubscriptionModel.find({
    ownerId: { $in: ownerIds },
    status: { $in: ["active", "past_due"] },
  })
    .sort({ createdAt: -1 })
    .lean<
      Array<{ ownerId: string; planId: string; status: SubscriptionStatus }>
    >()
    .exec();

  // Em teoria 1 ativa por owner — mas usamos a mais recente caso haja
  // duplicidade transitória durante migração de plano.
  const seen = new Set<string>();
  const out: ActiveSubscriptionRow[] = [];
  for (const d of docs) {
    if (seen.has(d.ownerId)) continue;
    seen.add(d.ownerId);
    out.push({ ownerId: d.ownerId, planId: d.planId, status: d.status });
  }
  return out;
}

async function fetchActiveWalletTotals(
  ownerIds: string[],
): Promise<WalletAggRow[]> {
  if (ownerIds.length === 0) return [];
  const now = new Date();
  return CreditWalletModel.aggregate<WalletAggRow>([
    {
      $match: {
        scope: "user",
        ownerId: { $in: ownerIds },
        balance: { $gt: 0 },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      },
    },
    {
      $group: {
        _id: "$ownerId",
        total: { $sum: "$balance" },
      },
    },
  ]).exec();
}

async function fetchActiveWalletDetails(
  ownerId: string,
): Promise<WalletDetailRow[]> {
  const now = new Date();
  return CreditWalletModel.find({
    scope: "user",
    ownerId,
    balance: { $gt: 0 },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .lean<WalletDetailRow[]>()
    .exec();
}

interface WalletWithRefRow {
  _id: string;
  source: CreditSource;
  externalRef: string | null;
}

async function fetchAllWalletsForOwner(
  ownerId: string,
): Promise<WalletWithRefRow[]> {
  return CreditWalletModel.find({ scope: "user", ownerId })
    .select("_id source externalRef")
    .lean<WalletWithRefRow[]>()
    .exec();
}

interface SubscriptionDocRow {
  _id: string;
  ownerId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
}

async function fetchAllSubscriptionsForOwner(
  ownerId: string,
): Promise<SubscriptionDocRow[]> {
  return SubscriptionModel.find({ ownerId })
    .sort({ createdAt: -1 })
    .lean<SubscriptionDocRow[]>()
    .exec();
}

async function fetchExamIdsAndCount(ownerId: string): Promise<{
  ids: string[];
  count: number;
  lastCreatedAt: Date | null;
}> {
  const docs = await ExamModel.find({ ownerId })
    .select("_id createdAt")
    .sort({ createdAt: -1 })
    .lean<Array<{ _id: string; createdAt: Date }>>()
    .exec();
  return {
    ids: docs.map((d) => d._id),
    count: docs.length,
    lastCreatedAt: docs[0]?.createdAt ?? null,
  };
}

interface SubmissionAggRow {
  count: number;
  avgScore: number | null;
  lastSubmittedAt: Date | null;
}

async function fetchSubmissionStats(ownerId: string): Promise<SubmissionAggRow> {
  const [row] = await SubmissionModel.aggregate<{
    count: number;
    avgScore: number;
    lastSubmittedAt: Date;
  }>([
    { $match: { ownerId, status: "submitted" } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgScore: { $avg: "$score" },
        lastSubmittedAt: { $max: "$submittedAt" },
      },
    },
  ]).exec();

  if (!row) {
    return { count: 0, avgScore: null, lastSubmittedAt: null };
  }
  return {
    count: row.count,
    avgScore: row.avgScore ?? null,
    lastSubmittedAt: row.lastSubmittedAt ?? null,
  };
}

interface LifetimeLedgerAggregate {
  /** Soma de débitos `ai_consumption` ao longo da vida. */
  totalAiConsumption: number;
  /** Última `createdAt` em débitos `ai_consumption`. */
  lastAiAt: Date | null;
  /**
   * Lista de entries `topup_purchase` (poucas por user — ok carregar tudo)
   * com seu metadata.topupId pra cálculo de LTV.
   */
  topupEntries: Array<{ topupId: string | null; createdAt: Date }>;
  /**
   * Lista de entries `subscription_renewal` (também poucas — uma por ciclo)
   * com walletId pra mapear de volta ao plano via wallet.externalRef.
   */
  renewalEntries: Array<{ walletId: string; createdAt: Date }>;
}

async function fetchLifetimeLedgerAggregate(
  ownerId: string,
): Promise<LifetimeLedgerAggregate> {
  // 3 queries leves no mesmo collection. Em volume, daria pra fundir num
  // pipeline com $facet — mas a contagem por user é baixa, fica legível
  // assim.
  const [aiAggRows, topupDocs, renewalDocs] = await Promise.all([
    LedgerEntryModel.aggregate<{
      total: number;
      lastAt: Date | null;
    }>([
      {
        $match: {
          scope: "user",
          ownerId,
          type: "debit",
          reason: "ai_consumption",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          lastAt: { $max: "$createdAt" },
        },
      },
    ]).exec(),
    LedgerEntryModel.find({
      scope: "user",
      ownerId,
      reason: "topup_purchase",
    })
      .select("metadata createdAt")
      .lean<Array<{ metadata: Record<string, unknown>; createdAt: Date }>>()
      .exec(),
    LedgerEntryModel.find({
      scope: "user",
      ownerId,
      reason: "subscription_renewal",
    })
      .select("walletId createdAt")
      .lean<Array<{ walletId: string; createdAt: Date }>>()
      .exec(),
  ]);

  return {
    totalAiConsumption: aiAggRows[0]?.total ?? 0,
    lastAiAt: aiAggRows[0]?.lastAt ?? null,
    topupEntries: topupDocs.map((d) => ({
      topupId:
        typeof d.metadata?.topupId === "string"
          ? (d.metadata.topupId as string)
          : null,
      createdAt: d.createdAt,
    })),
    renewalEntries: renewalDocs.map((d) => ({
      walletId: d.walletId,
      createdAt: d.createdAt,
    })),
  };
}

async function fetchRecentLedger(
  ownerId: string,
  limit: number,
): Promise<KintalRecentLedgerEntry[]> {
  const docs = await LedgerEntryModel.find({ scope: "user", ownerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<
      Array<{
        _id: string;
        type: "credit" | "debit";
        amount: number;
        reason: string;
        walletSource: string;
        relatedAction: string | null;
        tokensUsed: number | null;
        createdAt: Date;
      }>
    >()
    .exec();
  return docs.map((d) => ({
    id: d._id,
    type: d.type,
    amount: d.amount,
    reason: d.reason,
    walletSource: d.walletSource,
    relatedAction: d.relatedAction ?? null,
    tokensUsed: d.tokensUsed ?? null,
    createdAt: d.createdAt,
  }));
}

async function fetchUserOrganizations(
  authDb: Db,
  userId: string,
): Promise<KintalUserOrgInfo[]> {
  const memberDocs = await authDb
    .collection<{
      organizationId: ObjectId;
      role?: "owner" | "admin" | "member";
      createdAt?: Date;
    }>("member")
    .find({ userId: new ObjectId(userId) })
    .toArray();
  if (memberDocs.length === 0) return [];

  const orgOids = memberDocs.map((m) => m.organizationId);
  const orgDocs = await authDb
    .collection<{ _id: ObjectId; name?: string; slug?: string }>("organization")
    .find({ _id: { $in: orgOids } })
    .project<{ _id: ObjectId; name?: string; slug?: string }>({
      name: 1,
      slug: 1,
    })
    .toArray();
  const orgMap = new Map(orgDocs.map((o) => [String(o._id), o]));

  return memberDocs
    .map<KintalUserOrgInfo>((m) => {
      const orgId = String(m.organizationId);
      const org = orgMap.get(orgId);
      return {
        id: orgId,
        name: org?.name ?? "Sem nome",
        slug: org?.slug ?? null,
        role: m.role ?? "member",
        joinedAt: m.createdAt ?? new Date(),
      };
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role));
}

function roleRank(r: "owner" | "admin" | "member"): number {
  if (r === "owner") return 0;
  if (r === "admin") return 1;
  return 2;
}

function computeEngagement(input: {
  classesCount: number;
  studentsCount: number;
  examsCount: number;
  lastExamCreatedAt: Date | null;
  submissionStats: SubmissionAggRow;
  lifetimeAi: LifetimeLedgerAggregate;
}): KintalUserEngagement {
  const candidates: Array<Date | null> = [
    input.lastExamCreatedAt,
    input.submissionStats.lastSubmittedAt,
    input.lifetimeAi.lastAiAt,
  ];
  let last: Date | null = null;
  for (const d of candidates) {
    if (d && (!last || d.getTime() > last.getTime())) last = d;
  }
  return {
    classesCount: input.classesCount,
    studentsCount: input.studentsCount,
    examsCount: input.examsCount,
    submissionsCount: input.submissionStats.count,
    averageStudentScore:
      input.submissionStats.count > 0 && input.submissionStats.avgScore !== null
        ? round1(input.submissionStats.avgScore)
        : null,
    totalCreditsConsumed: input.lifetimeAi.totalAiConsumption,
    lastActivityAt: last,
  };
}

function computeBilling(input: {
  allSubs: SubscriptionDocRow[];
  allWallets: WalletWithRefRow[];
  lifetimeLedger: LifetimeLedgerAggregate;
}): KintalUserBilling {
  // Topups: contagem de entries + soma das prices via TOPUPS catalog.
  let topupsCount = 0;
  let topupsRevenueCents = 0;
  for (const t of input.lifetimeLedger.topupEntries) {
    topupsCount += 1;
    if (t.topupId && isTopupId(t.topupId)) {
      topupsRevenueCents += TOPUPS[t.topupId].priceCents;
    }
  }

  // Subscriptions: cada `subscription_renewal` representa um pagamento. Pra
  // saber o preço, mapeamos walletId → wallet.externalRef → planId via
  // SubscriptionModel.stripeSubscriptionId. Wallets sem externalRef ou subs
  // sem match (raro) somam 0 — preferimos LTV menor a estimar errado.
  const walletById = new Map(input.allWallets.map((w) => [w._id, w]));
  const planByStripeSubId = new Map(
    input.allSubs.map((s) => [s.stripeSubscriptionId, s.planId]),
  );

  let subRevenueCents = 0;
  for (const r of input.lifetimeLedger.renewalEntries) {
    const wallet = walletById.get(r.walletId);
    if (!wallet?.externalRef) continue;
    const planId = planByStripeSubId.get(wallet.externalRef);
    if (!planId) continue;
    if (!(planId in PLANS)) continue;
    subRevenueCents += PLANS[planId as PlanId].priceCents;
  }

  const history: KintalSubscriptionHistoryItem[] = input.allSubs.map((s) => ({
    id: s._id,
    planId: s.planId,
    status: s.status,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt,
    createdAt: s.createdAt,
  }));

  const current = history.find(
    (s) => s.status === "active" || s.status === "past_due",
  ) ?? null;

  return {
    lifetimeRevenueCents: topupsRevenueCents + subRevenueCents,
    lifetimeSubscriptionRevenueCents: subRevenueCents,
    lifetimeTopupsCount: topupsCount,
    lifetimeTopupsRevenueCents: topupsRevenueCents,
    currentSubscription: current
      ? (current as KintalSubscriptionHistoryItem & {
          status: "active" | "past_due";
        })
      : null,
    subscriptionsHistory: history,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function clampPageSize(raw: number | undefined): number {
  if (!raw || raw <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(raw, MAX_PAGE_SIZE);
}

/**
 * Busca todos os ownerIds (string) que batem com o filtro de assinatura.
 * Pra `"without"` retorna a lista de ownerIds com assinatura ativa
 * (active|past_due) — caller usa `$nin` em cima disso.
 *
 * Volume esperado é baixo (centenas/milhares); query não tem limit
 * propositalmente. Se virar gargalo, indexar `subscriptions.status`.
 */
async function fetchOwnerIdsForSubscription(
  filter: Exclude<ListKintalUsersFilter["subscription"], undefined | "any">,
): Promise<string[]> {
  const statuses: SubscriptionStatus[] =
    filter === "without"
      ? ["active", "past_due"]
      : [filter];
  const docs = await SubscriptionModel.find({
    status: { $in: statuses },
  })
    .select("ownerId")
    .lean<Array<{ ownerId: string }>>()
    .exec();
  // Dedup — pode haver subscriptions múltiplas pra mesmo owner durante
  // migrações de plano.
  return [...new Set(docs.map((d) => d.ownerId))];
}

function ownerIdsToObjectIds(ids: string[]): ObjectId[] {
  const out: ObjectId[] = [];
  for (const id of ids) {
    if (ObjectId.isValid(id)) out.push(new ObjectId(id));
  }
  return out;
}
