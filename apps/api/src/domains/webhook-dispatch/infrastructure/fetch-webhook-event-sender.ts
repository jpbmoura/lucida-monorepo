import type {
  OutboundWebhookRequest,
  OutboundWebhookResult,
  WebhookEventSender,
} from "../application/ports/webhook-event-sender.js";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `fetch` global do Node 20+. Sem retry — quando o sender é responsável
 * por retry persistente (futuro), ele será substituído por uma
 * implementação que enfileira no banco. Por ora, "best-effort com log".
 *
 * 2xx → ok. Qualquer outra coisa (não-2xx, timeout, DNS) → falha
 * silenciosa (log em stderr) — o caller não bloqueia a request do
 * aluno por culpa do endpoint do parceiro.
 */
export class FetchWebhookEventSender implements WebhookEventSender {
  async send(request: OutboundWebhookRequest): Promise<OutboundWebhookResult> {
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      const ok = res.status >= 200 && res.status < 300;
      if (!ok) {
        console.warn(
          `[webhook] ${request.url} responded ${res.status} — entrega tratada como falha`,
        );
      }
      return { ok, status: res.status };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "unknown webhook delivery error";
      console.warn(`[webhook] ${request.url} falhou: ${message}`);
      return { ok: false, status: 0, message };
    } finally {
      clearTimeout(t);
    }
  }
}
