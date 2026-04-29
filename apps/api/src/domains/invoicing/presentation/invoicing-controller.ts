import type { RequestHandler } from "express";
import { env } from "@/env.js";
import type { ProcessPendingInvoicesUseCase } from "../application/process-pending-invoices.js";
import type { HandleProviderWebhookUseCase } from "../application/handle-provider-webhook.js";
import type {
  ListInvoicesForOwnerUseCase,
  ListInvoicesForOrganizationUseCase,
} from "../application/list-invoices-for-owner.js";
import type { Invoice } from "../domain/invoice.js";
import { nfeIoEventSchema } from "../infrastructure/nfeio/nfeio-event-schema.js";
import { verifyNfeIoWebhook } from "../infrastructure/nfeio/nfeio-webhook-verify.js";
import { markEventProcessed } from "@/domains/billing/infrastructure/webhook-idempotency.js";

interface Deps {
  /**
   * Opcional. Quando NFE.io não está configurado, o composition root
   * passa null e os endpoints devolvem 503. Mesmo padrão de
   * `expireCredits` em billing.
   */
  processPending: ProcessPendingInvoicesUseCase | null;
  handleProviderWebhook: HandleProviderWebhookUseCase | null;
  /**
   * Listagem é sempre segura — quando NFE.io não está configurado, a
   * lista volta vazia (Invoice never gets created). Não precisa
   * gating no nível do endpoint.
   */
  listForOwner: ListInvoicesForOwnerUseCase;
  listForOrganization: ListInvoicesForOrganizationUseCase;
}

export class InvoicingController {
  constructor(private readonly deps: Deps) {}

  /**
   * POST /v1/internal/invoicing/process-pending
   *
   * Cron externo (Railway / GitHub Actions). Protegido por
   * `x-cron-secret` — sem header → 404 (esconde existência), sem env
   * → 503. Recomendado a cada 1 minuto.
   */
  processPending: RequestHandler = async (req, res, next) => {
    try {
      if (!env.CRON_SECRET) {
        res.status(503).json({
          code: "CRON_NOT_CONFIGURED",
          message: "CRON_SECRET não está definido.",
        });
        return;
      }
      if (req.headers["x-cron-secret"] !== env.CRON_SECRET) {
        res.status(404).end();
        return;
      }
      if (!this.deps.processPending) {
        res.status(503).json({
          code: "INVOICING_NOT_CONFIGURED",
          message: "NFE.io não está configurado neste ambiente.",
        });
        return;
      }
      const result = await this.deps.processPending.execute();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/invoicing/webhook
   *
   * Webhook do NFE.io. Body bruto (Buffer) — o router monta com
   * `express.raw()` antes do `express.json()` global. HMAC-SHA256
   * verificado contra `NFEIO_WEBHOOK_HMAC_SECRET`.
   *
   * Sempre devolve 200 quando assinatura bate; falhas internas viram
   * log mas não voltam 5xx pra evitar loop de reentregas. 4xx só pra
   * problema do remetente (signature/payload).
   */
  webhook: RequestHandler = async (req, res) => {
    if (!env.NFEIO_WEBHOOK_HMAC_SECRET) {
      res.status(503).end();
      return;
    }
    if (!this.deps.handleProviderWebhook) {
      res.status(503).end();
      return;
    }

    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body)) {
      res.status(400).json({ error: "Raw body missing." });
      return;
    }

    const ok = verifyNfeIoWebhook(
      body,
      req.headers,
      env.NFEIO_WEBHOOK_HMAC_SECRET,
    );
    if (!ok) {
      res.status(401).json({ error: "Invalid signature." });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(body.toString("utf-8"));
    } catch {
      res.status(400).json({ error: "Invalid JSON." });
      return;
    }

    const parsed = nfeIoEventSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error(
        "[invoicing] webhook NFE.io payload inválido:",
        parsed.error.message,
      );
      res.status(400).json({ error: "Invalid payload." });
      return;
    }

    // Idempotência: NFE.io geralmente expõe `id` no envelope; quando
    // ausente (versões antigas), composta com (id, flowStatus) bate o
    // mesmo papel — webhooks duplicados pra mesma transição são ignorados.
    const eventKey =
      parsed.data.id ??
      `${parsed.data.data.id}:${parsed.data.data.flowStatus}`;
    const { isNew } = await markEventProcessed({
      provider: "nfeio",
      eventKey,
      eventType: parsed.data.type ?? "serviceInvoice",
    });
    if (!isNew) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    try {
      await this.deps.handleProviderWebhook.execute(parsed.data);
    } catch (err) {
      console.error("[invoicing] handler de webhook NFE.io erro:", err);
    }
    res.status(200).json({ received: true });
  };

  /**
   * GET /v1/invoicing/me — notas iniciadas pelo user logado (pessoais
   * ou institucionais que ele disparou). Usado em /app/billing.
   */
  listMine: RequestHandler = async (req, res, next) => {
    try {
      const items = await this.deps.listForOwner.execute({
        ownerId: req.auth!.userId,
      });
      res.json({ data: items.map(toDTO) });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /v1/invoicing/organization — notas em que a org ativa foi
   * tomadora. Usado em /analytics/billing. Gated por requireOrgAdmin.
   */
  listOrganization: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) {
        res.json({ data: [] });
        return;
      }
      const items = await this.deps.listForOrganization.execute({
        organizationId: orgId,
      });
      res.json({ data: items.map(toDTO) });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * DTO enxuto pro frontend. Campos sensíveis (snapshot do tomador,
 * lastError) ficam fora — UI só precisa do necessário pra listar +
 * baixar PDF/XML. Quando precisarmos de detail page, criamos um
 * endpoint `GET :id` separado.
 */
export interface InvoiceListDTO {
  id: string;
  source: "subscription" | "topup_stripe" | "topup_pix";
  status: "pending" | "processing" | "issued" | "failed" | "cancelled";
  amountCents: number;
  description: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
  organizationId: string | null;
  /** "RPS A 1234" ou null quando não autorizada. */
  rpsLabel: string | null;
  issuedAt: string | null;
  createdAt: string;
}

function toDTO(invoice: Invoice): InvoiceListDTO {
  const rpsLabel =
    invoice.rpsNumber && invoice.rpsSeries
      ? `RPS ${invoice.rpsSeries} ${invoice.rpsNumber}`
      : null;
  return {
    id: invoice.id.toString(),
    source: invoice.source,
    status: invoice.status,
    amountCents: invoice.amountCents,
    description: invoice.items[0]?.description ?? "",
    pdfUrl: invoice.pdfUrl,
    xmlUrl: invoice.xmlUrl,
    organizationId: invoice.organizationId,
    rpsLabel,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
  };
}
