import { ObjectId, type Db } from "mongodb";
import { SubscriptionModel } from "@/domains/billing/infrastructure/subscription-schema.js";
import {
  InvalidAudienceError,
} from "../domain/notifications-errors.js";
import type {
  AudienceDescriptor,
  AudienceResolver,
  ResolvedAudience,
} from "../application/ports/audience-resolver.js";

/**
 * Resolve descritores de audiência em listas de userIds. Cruza:
 *  - BA `user` collection (driver nativo, _id é ObjectId)
 *  - subscriptions (Mongoose, ownerId é string hex)
 *  - BA `member` collection (organizationId/userId são ObjectId)
 *
 * Filtra staff de audiências "customer" — staff podem fazer broadcast pra
 * eles mesmos por engano em "todos os clientes". Audiência específica
 * (user X, organização Y) NÃO filtra staff — escolha explícita vence.
 */
export class MongoAudienceResolver implements AudienceResolver {
  constructor(private readonly authDb: Db) {}

  async resolve(descriptor: AudienceDescriptor): Promise<ResolvedAudience> {
    switch (descriptor.type) {
      case "user":
        return this.resolveUser(descriptor.userId);
      case "organization":
        return this.resolveOrganization(descriptor.organizationId);
      case "paying_customers":
        return this.resolvePayingCustomers();
      case "free_customers":
        return this.resolveFreeCustomers();
      case "all_customers":
        return this.resolveAllCustomers();
      case "org_members":
        return this.resolveOrgMembers(descriptor.organizationId);
    }
  }

  // ───── individual ─────────────────────────────────────────────

  private async resolveUser(userId: string): Promise<ResolvedAudience> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new InvalidAudienceError("Usuário não encontrado.");
    }
    return {
      recipientUserIds: [userId],
      label: user.email
        ? `Indivíduo: ${user.email}`
        : `Indivíduo: ${userId.slice(0, 8)}…`,
    };
  }

  // ───── institution ────────────────────────────────────────────

  private async resolveOrganization(
    organizationId: string,
  ): Promise<ResolvedAudience> {
    const org = await this.findOrgById(organizationId);
    if (!org) {
      throw new InvalidAudienceError("Instituição não encontrada.");
    }
    const userIds = await this.listOrgMemberUserIds(organizationId);
    return {
      recipientUserIds: userIds,
      label: `Instituição: ${org.name ?? organizationId.slice(0, 8)}…`,
    };
  }

  /** Mesmo que `organization`, usado pelo org_admin (label genérico). */
  private async resolveOrgMembers(
    organizationId: string,
  ): Promise<ResolvedAudience> {
    const userIds = await this.listOrgMemberUserIds(organizationId);
    return {
      recipientUserIds: userIds,
      label: "Membros da minha instituição",
    };
  }

  // ───── customer segments ──────────────────────────────────────

  private async resolvePayingCustomers(): Promise<ResolvedAudience> {
    const ownerIds = await this.listActiveSubscriptionOwners();
    const filtered = await this.removeStaff(ownerIds);
    return {
      recipientUserIds: filtered,
      label: "Todos os clientes pagantes",
    };
  }

  private async resolveFreeCustomers(): Promise<ResolvedAudience> {
    const [allCustomers, payingOwners] = await Promise.all([
      this.listAllNonStaffUserIds(),
      this.listActiveSubscriptionOwners(),
    ]);
    const paying = new Set(payingOwners);
    const free = allCustomers.filter((id) => !paying.has(id));
    return {
      recipientUserIds: free,
      label: "Clientes gratuitos (sem assinatura)",
    };
  }

  private async resolveAllCustomers(): Promise<ResolvedAudience> {
    const userIds = await this.listAllNonStaffUserIds();
    return {
      recipientUserIds: userIds,
      label: "Todos os clientes",
    };
  }

  // ───── helpers ────────────────────────────────────────────────

  private async findUserById(
    userId: string,
  ): Promise<{ id: string; email?: string } | null> {
    const collection = this.authDb.collection<{
      _id: ObjectId | string;
      id?: string;
      email?: string;
    }>("user");
    // BA mongodb adapter: `_id` em ObjectId, `id` (lógico) raramente.
    if (ObjectId.isValid(userId)) {
      const doc = await collection.findOne({
        _id: new ObjectId(userId),
      });
      if (doc) return { id: String(doc._id), email: doc.email };
    }
    const byLogical = await collection.findOne({ id: userId });
    if (byLogical) {
      return { id: String(byLogical._id), email: byLogical.email };
    }
    return null;
  }

  private async findOrgById(
    organizationId: string,
  ): Promise<{ id: string; name?: string } | null> {
    if (!ObjectId.isValid(organizationId)) return null;
    const doc = await this.authDb
      .collection<{ _id: ObjectId; name?: string }>("organization")
      .findOne({ _id: new ObjectId(organizationId) });
    return doc ? { id: String(doc._id), name: doc.name } : null;
  }

  private async listOrgMemberUserIds(
    organizationId: string,
  ): Promise<string[]> {
    if (!ObjectId.isValid(organizationId)) return [];
    const docs = await this.authDb
      .collection<{ userId: ObjectId }>("member")
      .find({ organizationId: new ObjectId(organizationId) })
      .project<{ userId: ObjectId }>({ userId: 1 })
      .toArray();
    return docs.map((d) => String(d.userId));
  }

  private async listAllNonStaffUserIds(): Promise<string[]> {
    const docs = await this.authDb
      .collection<{ _id: ObjectId; role?: string | null }>("user")
      .find({ role: { $ne: "staff" } })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    return docs.map((d) => String(d._id));
  }

  private async removeStaff(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    // Filtra IDs que casem com user staff. Mantém os que não estão na
    // coleção user também (safety — pode haver órfãos no subscriptions).
    const objectIds = userIds
      .filter(ObjectId.isValid)
      .map((id) => new ObjectId(id));
    const staffDocs = await this.authDb
      .collection<{ _id: ObjectId }>("user")
      .find({ _id: { $in: objectIds }, role: "staff" })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    const staffSet = new Set(staffDocs.map((d) => String(d._id)));
    return userIds.filter((id) => !staffSet.has(id));
  }

  private async listActiveSubscriptionOwners(): Promise<string[]> {
    const rows = await SubscriptionModel.aggregate<{ _id: string }>([
      { $match: { status: { $in: ["active", "past_due"] } } },
      { $group: { _id: "$ownerId" } },
    ]).exec();
    return rows.map((r) => r._id);
  }
}
