import { ObjectId, type Db } from "mongodb";
import type {
  OrganizationMembersRepository,
  OrgMember,
  OrgInfo,
  UserMembership,
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
      .collection<OrganizationDoc>("organization")
      .findOne({ _id: oid });
    if (!doc) return null;

    return {
      id: String(doc._id),
      name: doc.name ?? "",
      slug: doc.slug ?? "",
      taxId: doc.taxId ?? null,
      legalName: doc.legalName ?? null,
      municipalRegistration: doc.municipalRegistration ?? null,
      addressPostalCode: doc.addressPostalCode ?? null,
      addressStreet: doc.addressStreet ?? null,
      addressNumber: doc.addressNumber ?? null,
      addressComplement: doc.addressComplement ?? null,
      addressDistrict: doc.addressDistrict ?? null,
      addressCityCode: doc.addressCityCode ?? null,
      addressCityName: doc.addressCityName ?? null,
      addressStateUf: doc.addressStateUf ?? null,
      addressCountry: doc.addressCountry ?? null,
    };
  }

  async findRole(
    organizationId: string,
    userId: string,
  ): Promise<"owner" | "admin" | "member" | null> {
    let orgOid: ObjectId;
    try {
      orgOid = new ObjectId(organizationId);
    } catch {
      return null;
    }
    // userId pode ser ObjectId nativo (BA padrão) ou string Clerk legado.
    const userCandidates = userIdCandidates(userId);

    const doc = await this.authDb
      .collection<{ role?: "owner" | "admin" | "member" }>("member")
      .findOne(
        { organizationId: orgOid, userId: { $in: userCandidates } },
        { projection: { role: 1 } },
      );
    return doc?.role ?? null;
  }

  async listMembershipsByUser(userId: string): Promise<UserMembership[]> {
    const userCandidates = userIdCandidates(userId);

    const docs = await this.authDb
      .collection<{
        organizationId: ObjectId;
        role?: "owner" | "admin" | "member";
        createdAt?: Date;
      }>("member")
      .find({ userId: { $in: userCandidates } })
      .sort({ createdAt: 1 })
      .toArray();

    return docs.map((d) => ({
      organizationId: String(d.organizationId),
      role: d.role ?? "member",
      joinedAt: d.createdAt ?? new Date(0),
    }));
  }
}

/**
 * Gera os candidatos a `userId` pra query no Mongo. Sempre inclui a
 * string crua (cobre legacy Clerk) e, quando aplicável, o ObjectId
 * (BA padrão).
 */
function userIdCandidates(userId: string): Array<ObjectId | string> {
  const candidates: Array<ObjectId | string> = [userId];
  try {
    candidates.push(new ObjectId(userId));
  } catch {
    // userId não é hex de 24 — só a string crua é candidata.
  }
  return candidates;
}

/**
 * Shape do documento `organization` no BA MongoDB. Inclui os campos
 * `additionalFields` configurados em `auth.ts` (taxId + legalName +
 * endereço estruturado). Tudo opcional porque BetterAuth não força
 * default — orgs criadas antes da feature ficam sem.
 */
interface OrganizationDoc {
  _id: ObjectId;
  name?: string;
  slug?: string;
  taxId?: string | null;
  legalName?: string | null;
  municipalRegistration?: string | null;
  addressPostalCode?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCityCode?: string | null;
  addressCityName?: string | null;
  addressStateUf?: string | null;
  addressCountry?: string | null;
}
