/**
 * Status do ticket. MVP: dois estados.
 *  - open    → na fila do staff. Auto-criado pra novo ticket; auto-volta
 *              quando cliente responde um ticket fechado (reabre).
 *  - closed  → resolvido. Não some — fica visível com filtro. Cliente
 *              ainda pode responder; ao fazer isso, reabre automático.
 */
export type TicketStatus = "open" | "closed";
