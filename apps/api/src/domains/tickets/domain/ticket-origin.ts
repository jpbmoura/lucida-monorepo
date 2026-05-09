/**
 * De onde o ticket veio. Útil pra filtros e analytics.
 *  - email → cliente mandou pra contato@lucidaexam.com
 *  - form  → preencheu o formulário em /app/ajuda
 *  - staff → equipe iniciou via Kintal (compose new). Inbox/outbox split
 *            usa esse campo: outbox = origin "staff".
 */
export type TicketOrigin = "email" | "form" | "staff";
