import { ObjectId, type Db } from "mongodb";
import type {
  ResolveTakerInput,
  TakerResolver,
} from "../application/taker-resolver.js";
import type {
  TakerAddress,
  TakerSnapshot,
} from "../domain/taker-snapshot.js";

/**
 * Lê os dados fiscais do user e da org direto do BA MongoDB. BetterAuth
 * usa driver mongodb@7 e mantém os additionalFields no documento root —
 * sem nesting. IDs de referência são `ObjectId` nativo (não string hex).
 *
 * Retorna `null` quando dados obrigatórios faltam — caller (caso de uso
 * IssueInvoice) decide se loga + ignora ou propaga erro.
 */
export class BaTakerResolver implements TakerResolver {
  constructor(private readonly authDb: Db) {}

  async resolve(input: ResolveTakerInput): Promise<TakerSnapshot | null> {
    if (input.organizationId) {
      return this.resolveOrganization(input.organizationId, input.ownerEmail);
    }
    return this.resolveUser(input.ownerId);
  }

  private async resolveUser(userId: string): Promise<TakerSnapshot | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(userId);
    } catch {
      return null;
    }

    const doc = await this.authDb
      .collection<UserFiscalDoc>("user")
      .findOne({ _id: oid });
    if (!doc) return null;

    const taxId = digits(doc.taxId);
    const email = doc.email ?? "";
    if (!email) return null;

    if (taxId.length === 11) {
      const name = (doc.name ?? "").trim();
      if (!name) return null;
      return {
        type: "pf",
        cpf: taxId,
        name,
        email,
        address: this.buildAddress(doc),
      };
    }

    if (taxId.length === 14) {
      const legalName = (doc.legalName ?? "").trim();
      if (!legalName) return null;
      const address = this.buildAddress(doc);
      if (!address) return null;
      return {
        type: "pj",
        cnpj: taxId,
        legalName,
        email,
        municipalRegistration: trimOrNull(doc.municipalRegistration),
        address,
      };
    }

    return null;
  }

  private async resolveOrganization(
    organizationId: string,
    contactEmail: string,
  ): Promise<TakerSnapshot | null> {
    let oid: ObjectId;
    try {
      oid = new ObjectId(organizationId);
    } catch {
      return null;
    }

    const doc = await this.authDb
      .collection<OrgFiscalDoc>("organization")
      .findOne({ _id: oid });
    if (!doc) return null;

    const cnpj = digits(doc.taxId);
    if (cnpj.length !== 14) return null;

    const legalName = (doc.legalName ?? "").trim();
    if (!legalName) return null;

    const address = this.buildAddress(doc);
    if (!address) return null;

    if (!contactEmail) return null;

    return {
      type: "pj",
      cnpj,
      legalName,
      email: contactEmail,
      municipalRegistration: trimOrNull(doc.municipalRegistration),
      address,
    };
  }

  private buildAddress(doc: AddressFields): TakerAddress | null {
    const postalCode = digits(doc.addressPostalCode);
    const street = (doc.addressStreet ?? "").trim();
    const number = (doc.addressNumber ?? "").trim();
    const district = (doc.addressDistrict ?? "").trim();
    const cityCode = (doc.addressCityCode ?? "").trim();
    const cityName = (doc.addressCityName ?? "").trim();
    const stateUf = (doc.addressStateUf ?? "").trim().toUpperCase();

    // Mesma lista de obrigatórios que `requirePJFiscalData` no controller.
    if (
      !postalCode ||
      !street ||
      !number ||
      !district ||
      !cityCode ||
      !cityName ||
      !stateUf
    ) {
      return null;
    }

    return {
      postalCode,
      street,
      number,
      complement: trimOrNull(doc.addressComplement),
      district,
      cityCode,
      cityName,
      stateUf,
      country: trimOrNull(doc.addressCountry) ?? "BR",
    };
  }
}

// ─── Tipos auxiliares ────────────────────────────────────────────────

interface AddressFields {
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

interface UserFiscalDoc extends AddressFields {
  _id: ObjectId;
  email?: string;
  name?: string | null;
  taxId?: string | null;
  legalName?: string | null;
  municipalRegistration?: string | null;
}

interface OrgFiscalDoc extends AddressFields {
  _id: ObjectId;
  name?: string;
  taxId?: string | null;
  legalName?: string | null;
  municipalRegistration?: string | null;
}

function digits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

function trimOrNull(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed === "" ? null : trimmed;
}
