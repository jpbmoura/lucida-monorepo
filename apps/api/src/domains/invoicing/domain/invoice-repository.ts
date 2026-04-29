import type { Invoice } from "./invoice.js";
import { InvoiceId } from "./invoice-id.js";

export interface ListInvoicesOptions {
  /** Default 50, máx 200. */
  limit?: number;
  /** Cursor: createdAt anterior a essa data. */
  before?: Date;
}

export interface InvoiceRepository {
  nextId(): InvoiceId;

  save(invoice: Invoice): Promise<void>;

  findById(id: InvoiceId): Promise<Invoice | null>;

  /**
   * Lookup por externalRef — usado pelo `IssueInvoiceUseCase` pra
   * idempotência (webhook reentregue não cria Invoice nova).
   */
  findByExternalRef(externalRef: string): Promise<Invoice | null>;

  /**
   * Lookup pelo ID que o provider (NFE.io) atribui à nota — usado pelo
   * webhook handler pra correlacionar o evento com a Invoice local.
   * Null quando a Invoice ainda não foi enviada (sem providerInvoiceId).
   */
  findByProviderInvoiceId(providerInvoiceId: string): Promise<Invoice | null>;

  /**
   * Notas do user — pessoais (taker = user) ou em que ele iniciou o
   * pagamento (mesmo que tomador final tenha sido a org). UI decide
   * filtrar por organizationId se quiser separar.
   */
  findByOwner(
    ownerId: string,
    opts?: ListInvoicesOptions,
  ): Promise<Invoice[]>;

  /** Notas em que a org foi tomadora — usado em /analytics/billing. */
  findByOrganization(
    organizationId: string,
    opts?: ListInvoicesOptions,
  ): Promise<Invoice[]>;

  /**
   * Pendentes (`pending` + `processing` com idade) que precisam ser
   * processadas pelo worker. Inclui `processing` com mais de N minutos
   * sem update — assume que o webhook foi perdido e reconsulta o
   * provider via getInvoice.
   */
  findPendingForProcessing(opts: {
    limit: number;
    /** Idade mínima de `processing` pra reconsultar. Default 5min. */
    staleProcessingAfter?: Date;
  }): Promise<Invoice[]>;
}
