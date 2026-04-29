import type { Invoice } from "../domain/invoice.js";
import type { InvoiceRepository } from "../domain/invoice-repository.js";
import type { ProviderInvoiceStatus } from "../domain/invoice-provider.js";
import type { NfeIoEvent } from "../infrastructure/nfeio/nfeio-event-schema.js";
import type { InvoiceMailer } from "./invoice-mailer.js";

interface Deps {
  invoices: InvoiceRepository;
  mailer: InvoiceMailer;
}

/**
 * Aplica o estado vindo do webhook NFE.io na Invoice local. Mapeia
 * `flowStatus` raw pros 5 estados do nosso domínio (mesmo mapping que
 * o `NfeIoInvoiceProvider` usa em chamadas síncronas) e dispara o
 * email "nota emitida" com PDF anexo quando a transição é `issued`.
 *
 * Falha do email é best-effort — log + segue. Webhook devolve 200 pro
 * NFE.io independente, evitando reentregas em loop por bug nosso.
 *
 * Idempotência: o controller usa `markEventProcessed` antes de chamar
 * esse caso de uso — aqui assumimos primeira execução do mesmo evento.
 */
export class HandleProviderWebhookUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(event: NfeIoEvent): Promise<void> {
    const data = event.data;
    const invoice = await this.deps.invoices.findByProviderInvoiceId(data.id);
    if (!invoice) {
      // Pode acontecer se: (1) webhook chegou antes do worker persistir
      // `providerInvoiceId` (race rara — worker faz save logo após
      // receber resposta do POST); (2) evento de nota criada fora do
      // nosso fluxo. Logamos e ignoramos. NFE.io reentrega; quando a
      // Invoice existir, o handler processa.
      console.warn(
        "[invoicing] webhook NFE.io sem Invoice local:",
        data.id,
      );
      return;
    }

    if (invoice.isTerminal() && invoice.status !== "issued") {
      // Já está em failed/cancelled. Não regredir — registra log e ignora.
      console.warn(
        "[invoicing] webhook em invoice terminal, ignorando:",
        invoice.id.toString(),
        invoice.status,
      );
      return;
    }

    const newStatus = mapFlowStatus(data.flowStatus);
    const wasIssued = invoice.status === "issued";

    switch (newStatus) {
      case "issued": {
        const pdfUrl = data.pdfUrl;
        const xmlUrl = data.xmlUrl;
        if (!pdfUrl || !xmlUrl) {
          // Status diz issued mas as URLs não vieram — improvável, mas
          // mantém em processing pro worker reconsultar. Log pra debug.
          console.warn(
            "[invoicing] flowStatus=Issued sem pdfUrl/xmlUrl — mantendo em processing:",
            invoice.id.toString(),
          );
          invoice.markProcessing({
            providerInvoiceId: data.id,
            providerStatusRaw: data.flowStatus,
          });
          break;
        }
        invoice.markIssued({
          pdfUrl,
          xmlUrl,
          rpsNumber: normalizeRps(data.rpsNumber),
          rpsSeries: data.rpsSerialNumber ?? null,
          providerStatusRaw: data.flowStatus,
        });
        break;
      }

      case "failed": {
        invoice.markFailed({
          error: data.flowMessage ?? "Provider reportou falha sem mensagem.",
          providerStatusRaw: data.flowStatus,
        });
        break;
      }

      case "cancelled": {
        invoice.markCancelled({
          providerStatusRaw: data.flowStatus,
        });
        break;
      }

      default:
        // pending/processing — atualiza id/raw mas não muda status terminal
        invoice.markProcessing({
          providerInvoiceId: data.id,
          providerStatusRaw: data.flowStatus,
          pdfUrl: data.pdfUrl ?? null,
          xmlUrl: data.xmlUrl ?? null,
        });
        break;
    }

    await this.deps.invoices.save(invoice);

    // Email só na transição `→ issued` (não a cada webhook de "ainda
    // issued"). `wasIssued` evita duplicado caso o NFE.io reentregue
    // o mesmo evento por outro motivo.
    if (invoice.status === "issued" && !wasIssued) {
      await this.dispatchIssuedEmail(invoice);
    }
  }

  private async dispatchIssuedEmail(invoice: Invoice): Promise<void> {
    const taker = invoice.taker;
    const to = taker.email;
    if (!to) {
      console.warn(
        "[invoicing] sem email no taker, pulando notificação:",
        invoice.id.toString(),
      );
      return;
    }
    const takerName = taker.type === "pf" ? taker.name : taker.legalName;
    const pdfUrl = invoice.pdfUrl;
    const xmlUrl = invoice.xmlUrl;
    const issuedAt = invoice.issuedAt;
    const providerInvoiceId = invoice.providerInvoiceId;
    if (!pdfUrl || !xmlUrl || !issuedAt || !providerInvoiceId) {
      // Defesa: status==issued mas algum campo essencial está null.
      // markIssued garante pdf/xml/issuedAt; só skipamos se houver bug.
      console.warn(
        "[invoicing] estado issued sem campos pra email:",
        invoice.id.toString(),
      );
      return;
    }

    try {
      await this.deps.mailer.sendInvoiceIssued({
        to,
        takerName,
        pdfUrl,
        xmlUrl,
        rpsNumber: invoice.rpsNumber,
        rpsSeries: invoice.rpsSeries,
        providerInvoiceId,
        amountCents: invoice.amountCents,
        issuedAt,
      });
    } catch (err) {
      console.error(
        "[invoicing] falha ao enviar email de nota emitida:",
        invoice.id.toString(),
        err,
      );
    }
  }
}

// ─── helpers ───────────────────────────────────────────────────────

const NFEIO_STATUS_MAP: Record<string, ProviderInvoiceStatus> = {
  WaitingCalculateTaxes: "processing",
  WaitingDefineRpsNumber: "processing",
  WaitingSend: "processing",
  WaitingReturn: "processing",
  WaitingDownload: "processing",
  Issued: "issued",
  Cancelled: "cancelled",
  WaitingSendCancel: "processing",
  CancelFailed: "issued",
  IssueFailed: "failed",
  Error: "failed",
};

function mapFlowStatus(raw: string): ProviderInvoiceStatus {
  return NFEIO_STATUS_MAP[raw] ?? "processing";
}

function normalizeRps(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}
