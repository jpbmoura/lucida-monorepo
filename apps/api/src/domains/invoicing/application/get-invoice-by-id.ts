import { DomainError } from "@/shared/errors/domain-error.js";
import { InvoiceId } from "../domain/invoice-id.js";
import type { InvoiceRepository } from "../domain/invoice-repository.js";
import type { Invoice } from "../domain/invoice.js";

export class InvoiceNotFoundError extends DomainError {
  readonly code = "INVOICE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Nota fiscal não encontrada.");
  }
}

export class InvoiceForbiddenError extends DomainError {
  readonly code = "INVOICE_FORBIDDEN";
  readonly statusCode = 404; // mesmo do not_found pra esconder existência
  constructor() {
    super("Nota fiscal não encontrada.");
  }
}

export interface GetInvoiceByIdInput {
  id: string;
  /** User pedindo. Se a Invoice não pertence a ele (e não é da org dele), 404. */
  callerUserId: string;
  /** Org ativa do caller. Se a nota é institucional, valida pertence à org. */
  callerOrganizationId: string | null;
}

/**
 * Busca uma Invoice por id, garantindo autorização: o caller só vê a
 * nota se for o `ownerId` ou se for um membro da org tomadora (a
 * checagem de role acontece no middleware `requireOrgAdmin` da rota,
 * não aqui).
 */
export class GetInvoiceByIdUseCase {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(input: GetInvoiceByIdInput): Promise<Invoice> {
    const invoice = await this.invoices.findById(InvoiceId.of(input.id));
    if (!invoice) throw new InvoiceNotFoundError();

    const isOwner = invoice.isOwnedBy(input.callerUserId);
    const isOrgInvoice =
      invoice.organizationId !== null &&
      invoice.organizationId === input.callerOrganizationId;
    if (!isOwner && !isOrgInvoice) {
      throw new InvoiceForbiddenError();
    }
    return invoice;
  }
}
