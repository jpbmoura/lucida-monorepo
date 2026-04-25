import { ObjectId, type Db } from "mongodb";
import type {
  OrganizationInvitationsRepository,
  PendingInvitation,
  InvitationPublicInfo,
} from "../application/ports/organization-invitations-repository.js";

/**
 * Lê `invitation` do BA DB. Schema observado (BA 1.6 + mongodb adapter):
 *
 *   _id: ObjectId
 *   organizationId: ObjectId
 *   inviterId: ObjectId
 *   email: string
 *   role: "owner" | "admin" | "member"
 *   status: "pending" | "accepted" | "canceled" | "rejected"
 *   expiresAt: Date
 *   createdAt: Date
 *
 * Como `inviterId` é ObjectId mas a API serializa como hex, toda query de
 * match usa `new ObjectId(id)` (igual ao padrão do members repo).
 */
export class BaOrganizationInvitationsRepository
  implements OrganizationInvitationsRepository
{
  constructor(private readonly authDb: Db) {}

  async listPending(organizationId: string): Promise<PendingInvitation[]> {
    let orgOid: ObjectId;
    try {
      orgOid = new ObjectId(organizationId);
    } catch {
      return [];
    }

    const now = new Date();

    // "pending" real = status pendente E ainda não expirado. Convites
    // expirados ficam em status="pending" no banco (BA não tem cron de
    // limpeza); filtramos em memória/query pra não mostrar ruído na UI.
    const docs = await this.authDb
      .collection<{
        _id: ObjectId;
        email: string;
        role: "owner" | "admin" | "member";
        status: "pending" | "accepted" | "canceled" | "rejected";
        inviterId: ObjectId;
        expiresAt: Date;
        createdAt: Date;
      }>("invitation")
      .find({
        organizationId: orgOid,
        status: "pending",
        expiresAt: { $gt: now },
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (docs.length === 0) return [];

    // Resolve nomes dos inviters em uma query só.
    const inviterIds = Array.from(
      new Set(docs.map((d) => String(d.inviterId))),
    ).map((id) => new ObjectId(id));
    const inviterDocs = await this.authDb
      .collection<{ _id: ObjectId; name?: string; email?: string }>("user")
      .find({ _id: { $in: inviterIds } })
      .project<{ _id: ObjectId; name?: string; email?: string }>({
        name: 1,
        email: 1,
      })
      .toArray();
    const inviterMap = new Map(inviterDocs.map((u) => [String(u._id), u]));

    return docs.map((d) => {
      const inviter = inviterMap.get(String(d.inviterId));
      return {
        id: String(d._id),
        email: d.email,
        role: d.role,
        status: d.status,
        invitedAt: d.createdAt,
        expiresAt: d.expiresAt,
        inviterName: inviter?.name ?? "Administrador",
        inviterEmail: inviter?.email ?? "",
      };
    });
  }

  async getPublicInfo(
    invitationId: string,
  ): Promise<InvitationPublicInfo | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(invitationId);
    } catch {
      return null;
    }

    const doc = await this.authDb
      .collection<{
        _id: ObjectId;
        email: string;
        role: "owner" | "admin" | "member";
        status: "pending" | "accepted" | "canceled" | "rejected";
        inviterId: ObjectId;
        organizationId: ObjectId;
        expiresAt: Date;
      }>("invitation")
      .findOne({ _id: oid });
    if (!doc) return null;

    // Lookup paralelo: nome da org + nome do inviter.
    const [org, inviter] = await Promise.all([
      this.authDb
        .collection<{ _id: ObjectId; name?: string }>("organization")
        .findOne({ _id: doc.organizationId }, { projection: { name: 1 } }),
      this.authDb
        .collection<{ _id: ObjectId; name?: string }>("user")
        .findOne({ _id: doc.inviterId }, { projection: { name: 1 } }),
    ]);

    return {
      id: String(doc._id),
      email: doc.email,
      role: doc.role,
      status: doc.status,
      expiresAt: doc.expiresAt,
      organizationName: org?.name ?? "Instituição",
      inviterName: inviter?.name ?? "Administrador",
    };
  }
}
