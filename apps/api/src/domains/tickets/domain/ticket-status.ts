/**
 * Status do ticket (= conversa de email com o cliente).
 *
 *  - new          → recebido, ainda ninguém da equipe respondeu nem
 *                   moveu manualmente. É o estado inicial.
 *  - in_progress  → equipe assumiu (respondeu pelo menos uma vez OU
 *                   reabriu um done explicitamente). É também o estado
 *                   pra qual auto-volta quando cliente responde um done.
 *  - done         → resolvido. Cliente que responder reabre como
 *                   in_progress (preserva histórico, não vira novo).
 */
export type TicketStatus = "new" | "in_progress" | "done";
