import { ObjectId, type Db } from "mongodb";
import type {
  OrganizationMembersRepository,
  OrgMember,
  OrgInfo,
} from "../application/ports/organization-members-repository.js";

/**
 * Lê members/organizations direto do BA DB (mongodb@7). Não usa Mongoose —
 * BA tem sua própria conexão, schemas e convenções de ID.
 *
 * **Convenção crítica:** no BA MongoDB adapter, IDs de referência
 * (`member.userId`, `member.organizationId`) são guardados como **ObjectId
 * nativo**, não como string hex. A API serializa como string ao sair, o que
 * cria a ilusão de string no JSON, mas queries precisam usar ObjectId.
 * Este adapter converte o hex recebido em ObjectId antes de filtrar.
 */
export class BaOrganizationMembersRepository
  implements OrganizationMembersRepository
{
  constructor(private readonly authDb: Db) {}

  async listMembers(organizationId: string): Promise<OrgMember[]> {
    let orgOid: ObjectId;
    try {
      orgOid = new ObjectId(organizationId);
    } catch {
      return [];
    }

    // member.organizationId é ObjectId no banco. Busca por string devolve 0.
    const memberDocs = await this.authDb
      .collection<{
        userId: ObjectId;
        role?: "owner" | "admin" | "member";
        createdAt?: Date;
      }>("member")
      .find({ organizationId: orgOid })
      .toArray();

    if (memberDocs.length === 0) return [];

    const userObjectIds = memberDocs.map((m) => m.userId);
    const userDocs = await this.authDb
      .collection<{
        _id: ObjectId;
        name?: string;
        email?: string;
        image?: string;
      }>("user")
      .find({ _id: { $in: userObjectIds } })
      .project<{
        _id: ObjectId;
        name?: string;
        email?: string;
        image?: string;
      }>({ name: 1, email: 1, image: 1 })
      .toArray();

    const userMap = new Map(userDocs.map((u) => [String(u._id), u]));

    return memberDocs.map((m) => {
      const userIdHex = String(m.userId);
      const user = userMap.get(userIdHex);
      return {
        userId: userIdHex,
        role: m.role ?? "member",
        name: user?.name ?? "Sem nome",
        email: user?.email ?? "",
        image: user?.image ?? null,
        joinedAt: m.createdAt ?? new Date(),
      };
    });
  }

  async getOrganization(organizationId: string): Promise<OrgInfo | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(organizationId);
    } catch {
      return null;
    }

    const doc = await this.authDb
      .collection<{ _id: ObjectId; name?: string; slug?: string }>("organization")
      .findOne({ _id: oid });
    if (!doc) return null;

    return {
      id: String(doc._id),
      name: doc.name ?? "",
      slug: doc.slug ?? "",
    };
  }

  async findRole(
    organizationId: string,
    userId: string,
  ): Promise<"owner" | "admin" | "member" | null> {
    let orgOid: ObjectId;
    let userOid: ObjectId;
    try {
      orgOid = new ObjectId(organizationId);
      userOid = new ObjectId(userId);
    } catch {
      return null;
    }

    const doc = await this.authDb
      .collection<{ role?: "owner" | "admin" | "member" }>("member")
      .findOne(
        { organizationId: orgOid, userId: userOid },
        { projection: { role: 1 } },
      );
    return doc?.role ?? null;
  }
}
