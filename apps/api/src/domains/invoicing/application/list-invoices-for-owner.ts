import type { Invoice } from "../domain/invoice.js";
import type {
  InvoiceRepository,
  ListInvoicesOptions,
} from "../domain/invoice-repository.js";

export interface ListInvoicesForOwnerInput extends ListInvoicesOptions {
  ownerId: string;
}

/**
 * Lista as notas do user — usado em `/app/billing` (UI da PR 8). Inclui
 * notas institucionais que o user iniciou (mesmo quando tomador é a
 * org). UI distingue visualmente via `organizationId` no DTO.
 */
export class ListInvoicesForOwnerUseCase {
  constructor(private readonly invoices: InvoiceRepository) {}

  execute(input: ListInvoicesForOwnerInput): Promise<Invoice[]> {
    return this.invoices.findByOwner(input.ownerId, {
      limit: input.limit,
      before: input.before,
    });
  }
}

export interface ListInvoicesForOrganizationInput extends ListInvoicesOptions {
  organizationId: string;
}

/** Lista as notas em que a org foi tomadora — usado em /analytics/billing. */
export class ListInvoicesForOrganizationUseCase {
  constructor(private readonly invoices: InvoiceRepository) {}

  execute(input: ListInvoicesForOrganizationInput): Promise<Invoice[]> {
    return this.invoices.findByOrganization(input.organizationId, {
      limit: input.limit,
      before: input.before,
    });
  }
}
