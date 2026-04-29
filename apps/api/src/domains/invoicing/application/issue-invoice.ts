import type { InvoiceRepository } from "../domain/invoice-repository.js";
import { Invoice } from "../domain/invoice.js";
import type { InvoiceSource } from "../domain/invoice-source.js";
import { InvoiceTakerMissingError } from "../domain/invoicing-errors.js";
import type { LucidaEmitterConfig } from "../infrastructure/nfeio/lucida-emitter-config.js";
import type { TakerResolver } from "./taker-resolver.js";

export interface IssueInvoiceInput {
  source: InvoiceSource;
  /**
   * Identificador único da transação que originou a nota.
   *  - `stripe:invoice:{invoice_id}`   → subscription
   *  - `stripe:session:{session_id}`   → topup cartão
   *  - `abacate:{abacateId}`           → topup PIX
   */
  externalRef: string;
  ownerId: string;
  /**
   * Email de contato. Pra tomador = user, é informativo (resolver lê do
   * doc do user); pra tomador = org, vira o email do tomador na nota.
   */
  ownerEmail: string;
  /** Quando set, tomador = org (cobrança institucional); senão tomador = user. */
  organizationId?: string | null;
  amountCents: number;
  /** Texto livre que aparece como "Discriminação" da nota. */
  description: string;
  metadata?: Record<string, string>;
}

export interface IssueInvoiceOutput {
  /** ID da Invoice local (não do provider). */
  invoiceId: string;
  /** True quando criou; false quando já existia (idempotência). */
  created: boolean;
}

/**
 * Cria uma Invoice em estado `pending`. **Não** chama o provider — o
 * worker `ProcessPendingInvoicesUseCase` (PR 6) faz isso depois,
 * assíncrono. Esse caso de uso é leve o suficiente pra rodar dentro do
 * webhook handler do Stripe/AbacatePay sem comprometer o time-to-200.
 *
 * Idempotência por `externalRef` — se o webhook reentregar e a Invoice
 * já existir, devolve a existente sem alterar nada. O índice unique no
 * schema garante a invariante mesmo em corrida (caller pega a versão
 * persistida).
 *
 * Lança `InvoiceTakerMissingError` se os dados fiscais do tomador estão
 * incompletos. Webhook handlers tratam como skip + log (best-effort) —
 * pagamento já caiu, NF é o "extra" que falhou silenciosamente.
 */
export class IssueInvoiceUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly takerResolver: TakerResolver,
    private readonly emitter: LucidaEmitterConfig,
  ) {}

  async execute(input: IssueInvoiceInput): Promise<IssueInvoiceOutput> {
    const existing = await this.invoices.findByExternalRef(input.externalRef);
    if (existing) {
      return { invoiceId: existing.id.toString(), created: false };
    }

    const taker = await this.takerResolver.resolve({
      ownerId: input.ownerId,
      ownerEmail: input.ownerEmail,
      organizationId: input.organizationId ?? null,
    });
    if (!taker) {
      throw new InvoiceTakerMissingError(
        input.ownerId,
        input.organizationId ?? null,
      );
    }

    // Items: hoje 1 por nota, com códigos do emitter config. Manter como
    // array deixa espaço pra composição futura sem mudar schema.
    const items = [
      {
        description: input.description,
        amountCents: input.amountCents,
        federalServiceCode: this.emitter.federalServiceCode,
        cityServiceCode: this.emitter.cityServiceCode,
      },
    ];

    const invoice = Invoice.create({
      id: this.invoices.nextId(),
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      source: input.source,
      externalRef: input.externalRef,
      taker,
      items,
      amountCents: input.amountCents,
      metadata: input.metadata,
    });

    try {
      await this.invoices.save(invoice);
    } catch (err) {
      // Race: outra request criou a mesma externalRef entre o find e o
      // save. Mongo dá DuplicateKey (E11000) por causa do unique index.
      // Buscamos de novo e devolvemos a existente — operação idempotente.
      if (isDuplicateKey(err)) {
        const created = await this.invoices.findByExternalRef(
          input.externalRef,
        );
        if (created) {
          return { invoiceId: created.id.toString(), created: false };
        }
      }
      throw err;
    }
    return { invoiceId: invoice.id.toString(), created: true };
  }
}

function isDuplicateKey(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === 11000;
}
