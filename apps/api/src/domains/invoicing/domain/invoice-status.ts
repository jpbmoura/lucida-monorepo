/**
 * Estados da Invoice no nosso lado. Espelham os 5 estados que o
 * `InvoiceProvider` reporta — não há tradução adicional aqui.
 *
 *  - pending:    criada localmente, ainda não enviada ao NFE.io.
 *                Worker (`ProcessPendingInvoicesUseCase`, PR 6) é quem
 *                avança pra `processing`.
 *  - processing: NFE.io recebeu, está enfileirado/aguardando prefeitura.
 *                Webhook NFE.io (PR 7) avança pra `issued`/`failed`.
 *  - issued:     prefeitura autorizou. `pdfUrl` e `xmlUrl` preenchidos.
 *                Estado terminal feliz.
 *  - failed:     rejeição permanente (dado inválido, código de serviço
 *                não aceito etc). `lastError` populado. Reemissão
 *                manual depois de corrigir.
 *  - cancelled:  pós-MVP. Disparado por cancelamento administrativo
 *                (refund, pedido do user) — regra municipal limita prazo.
 */
export type InvoiceStatus =
  | "pending"
  | "processing"
  | "issued"
  | "failed"
  | "cancelled";
