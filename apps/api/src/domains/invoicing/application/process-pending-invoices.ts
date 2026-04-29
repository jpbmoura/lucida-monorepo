import { Invoice } from "../domain/invoice.js";
import type {
  InvoiceProvider,
  IssueInvoiceInput as ProviderIssueInput,
  ProviderInvoiceResult,
} from "../domain/invoice-provider.js";
import type { InvoiceRepository } from "../domain/invoice-repository.js";
import {
  InvoiceProviderRejectedError,
  InvoiceProviderUpstreamError,
} from "../domain/invoicing-errors.js";

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MAX_ATTEMPTS = 5;

export interface ProcessPendingInvoicesInput {
  /** Default 25. Cron tem janela de 1min — 25 é confortável. */
  batchSize?: number;
  /**
   * Cap de tentativas pra falhas upstream sem rejeição clara. Após
   * isso, marca como `failed` definitivamente (staff investiga).
   * Default 5.
   */
  maxAttempts?: number;
}

export interface ProcessPendingInvoicesOutput {
  processed: number;
  issued: number;
  failed: number;
  /** Ainda em pending/processing após esse run. */
  stillPending: number;
}

/**
 * Worker que processa as Invoices pendentes — primeira tentativa via
 * `provider.issueInvoice`, e reconsulta de `processing` antigo via
 * `provider.getInvoice` (caso o webhook tenha sido perdido).
 *
 * Roda via cron — `POST /v1/internal/invoicing/process-pending`.
 * Idempotente: cada Invoice tem unique externalRef no provider, então
 * uma tentativa repetida só re-confirma o estado.
 *
 * Tratamento de erro:
 *  - InvoiceProviderRejectedError (4xx) → markFailed (não retentar)
 *  - InvoiceProviderUpstreamError (5xx/timeout) → recordTransientFailure
 *    + retentar na próxima rodada, até `maxAttempts`.
 *  - Erro inesperado → log + skip pra não derrubar o batch inteiro.
 */
export class ProcessPendingInvoicesUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly provider: InvoiceProvider,
  ) {}

  async execute(
    input: ProcessPendingInvoicesInput = {},
  ): Promise<ProcessPendingInvoicesOutput> {
    const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
    const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    const candidates = await this.invoices.findPendingForProcessing({
      limit: batchSize,
    });

    let issued = 0;
    let failed = 0;
    let stillPending = 0;

    for (const invoice of candidates) {
      try {
        await this.processOne(invoice, maxAttempts);
        // Re-lê status: a entidade mutou in-place dentro de processOne.
        if (invoice.status === "issued") issued++;
        else if (invoice.status === "failed") failed++;
        else stillPending++;
      } catch (err) {
        // Erro inesperado (não veio do provider). Log + segue — não dá
        // pra abortar o batch inteiro por causa de uma nota problemática.
        console.error(
          "[invoicing] erro inesperado processando invoice:",
          invoice.id.toString(),
          err,
        );
        stillPending++;
      }
    }

    return {
      processed: candidates.length,
      issued,
      failed,
      stillPending,
    };
  }

  private async processOne(invoice: Invoice, maxAttempts: number): Promise<void> {
    if (invoice.status === "pending") {
      await this.handlePending(invoice, maxAttempts);
    } else if (invoice.status === "processing") {
      await this.handleStaleProcessing(invoice, maxAttempts);
    }
    // outros status (issued/failed/cancelled) não chegam aqui — repo filtra.
  }

  private async handlePending(invoice: Invoice, maxAttempts: number): Promise<void> {
    if (invoice.attempts >= maxAttempts) {
      invoice.markFailed({
        error: `Excedeu ${maxAttempts} tentativas sem sucesso.`,
      });
      await this.invoices.save(invoice);
      return;
    }

    const input = this.buildProviderInput(invoice);

    let result: ProviderInvoiceResult;
    try {
      result = await this.provider.issueInvoice(input);
    } catch (err) {
      await this.handleProviderError(invoice, err);
      return;
    }

    this.applyResult(invoice, result);
    await this.invoices.save(invoice);
  }

  private async handleStaleProcessing(
    invoice: Invoice,
    maxAttempts: number,
  ): Promise<void> {
    if (!invoice.providerInvoiceId) {
      // Inconsistência: marcou processing sem id. Volta a contar como
      // tentativa pra eventualmente virar failed.
      invoice.recordTransientFailure({
        error: "processing sem providerInvoiceId — estado inconsistente",
      });
      if (invoice.attempts >= maxAttempts) {
        invoice.markFailed({
          error: `Excedeu ${maxAttempts} tentativas sem providerInvoiceId.`,
        });
      }
      await this.invoices.save(invoice);
      return;
    }

    let result: ProviderInvoiceResult;
    try {
      result = await this.provider.getInvoice(invoice.providerInvoiceId);
    } catch (err) {
      await this.handleProviderError(invoice, err);
      return;
    }

    this.applyResult(invoice, result);
    await this.invoices.save(invoice);
  }

  private async handleProviderError(
    invoice: Invoice,
    err: unknown,
  ): Promise<void> {
    if (err instanceof InvoiceProviderRejectedError) {
      invoice.markFailed({ error: err.message });
      await this.invoices.save(invoice);
      return;
    }
    if (err instanceof InvoiceProviderUpstreamError) {
      invoice.recordTransientFailure({ error: err.message });
      await this.invoices.save(invoice);
      return;
    }
    throw err; // erro desconhecido sobe pra outer catch
  }

  private buildProviderInput(invoice: Invoice): ProviderIssueInput {
    // Hoje 1 item por nota — assumimos invoice.items[0] direto. Quando
    // suportarmos composição, agregar description e somar amounts aqui.
    const item = invoice.items[0];
    if (!item) {
      throw new Error(
        `Invoice ${invoice.id.toString()} sem items — estado inválido.`,
      );
    }
    return {
      externalRef: invoice.externalRef,
      taker: invoice.taker,
      serviceDescription: item.description,
      federalServiceCode: item.federalServiceCode,
      cityServiceCode: item.cityServiceCode,
      amountCents: invoice.amountCents,
      metadata: this.flattenMetadata(invoice.metadata),
    };
  }

  /**
   * NFE.io aceita só `Record<string, string>` em metadata, e a Invoice
   * já guarda nesse formato — mas defensivamente coercemos pra string.
   */
  private flattenMetadata(meta: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      out[k] = String(v);
    }
    return out;
  }

  private applyResult(invoice: Invoice, result: ProviderInvoiceResult): void {
    if (result.status === "issued" && result.pdfUrl && result.xmlUrl) {
      invoice.markIssued({
        pdfUrl: result.pdfUrl,
        xmlUrl: result.xmlUrl,
        rpsNumber: result.rpsNumber,
        rpsSeries: result.rpsSeries,
        providerStatusRaw: result.providerStatusRaw,
      });
      return;
    }
    if (result.status === "failed") {
      invoice.markFailed({
        error: result.errorMessage ?? "Provider reportou falha sem mensagem.",
        providerStatusRaw: result.providerStatusRaw,
      });
      return;
    }
    if (result.status === "cancelled") {
      invoice.markCancelled({
        providerStatusRaw: result.providerStatusRaw,
      });
      return;
    }
    // pending/processing (ou issued sem URLs ainda) → mantém em processing
    // e atualiza providerInvoiceId/URLs parciais. Bumpa attempts.
    invoice.markProcessing({
      providerInvoiceId: result.providerInvoiceId,
      providerStatusRaw: result.providerStatusRaw,
      pdfUrl: result.pdfUrl,
      xmlUrl: result.xmlUrl,
    });
  }
}
