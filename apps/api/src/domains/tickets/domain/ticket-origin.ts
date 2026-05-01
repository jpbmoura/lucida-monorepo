/**
 * De onde o ticket veio. Útil pra filtros e analytics.
 *  - email → cliente mandou pra contato@lucidaexam.com
 *  - form  → preencheu o formulário em /app/ajuda
 */
export type TicketOrigin = "email" | "form";
