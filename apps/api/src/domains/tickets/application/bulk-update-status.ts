import { TicketId } from "../domain/ticket-id.js";
import type { TicketRepository } from "../domain/ticket-repository.js";

/**
 * Status alvo das ações em massa pela UI. Não inclui `"new"` (não há
 * caso de uso pra voltar pra fila inicial em lote).
 */
export type BulkTargetStatus = "in_progress" | "done" | "read";

export interface BulkUpdateStatusInput {
  ids: string[];
  status: BulkTargetStatus;
}

export interface BulkUpdateStatusOutput {
  /** IDs efetivamente atualizados (existem + a transição mudou estado). */
  updatedIds: string[];
  /** IDs que não foram encontrados — staff vê alerta na UI se houver. */
  notFoundIds: string[];
}

/**
 * Aplica mudança de status em N tickets selecionados. Cada operação é
 * idempotente no aggregate — chamar `markDone` num done é no-op,
 * chamar `reopen` num `new` é no-op.
 *
 * Estratégia simples: itera os ids, carrega cada ticket, aplica a
 * transição correspondente e salva. Volume típico (até 50 por
 * página) torna isso aceitável; se virar gargalo, dá pra otimizar com
 * `bulkWrite` no repo.
 *
 * Mapeamento status alvo → método do aggregate:
 *  - "done"        → `markDone()`
 *  - "read"        → `markRead()`
 *  - "in_progress" → `reopen()` (só efetivo em done/read; em new/in_progress é no-op)
 */
export class BulkUpdateStatusUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(
    input: BulkUpdateStatusInput,
  ): Promise<BulkUpdateStatusOutput> {
    const updatedIds: string[] = [];
    const notFoundIds: string[] = [];

    for (const rawId of input.ids) {
      const id = rawId.trim();
      if (!id) continue;
      const ticket = await this.tickets.findById(TicketId.of(id));
      if (!ticket) {
        notFoundIds.push(id);
        continue;
      }
      const before = ticket.status;
      switch (input.status) {
        case "done":
          ticket.markDone();
          break;
        case "read":
          ticket.markRead();
          break;
        case "in_progress":
          ticket.reopen();
          break;
      }
      // Só persiste se o aggregate mudou de fato — economiza writes
      // em ações redundantes (tudo já estava no estado pedido).
      if (ticket.status !== before) {
        await this.tickets.save(ticket);
        updatedIds.push(id);
      }
    }

    return { updatedIds, notFoundIds };
  }
}
