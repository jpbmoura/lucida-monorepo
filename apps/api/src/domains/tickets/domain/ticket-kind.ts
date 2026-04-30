/**
 * Discriminator do ticket. Cada email recebido vira um Ticket; o `kind`
 * separa o fluxo:
 *
 *  - support  → emails pra `suporte@lucidaexam.com`. Tem auto-resposta,
 *               status `open`/`closed`, fluxo de helpdesk.
 *  - general  → catch-all (qualquer outro `*@lucidaexam.com`, ex: `contato@`).
 *               Sem auto-resposta. Status é per-user via `readByUserIds`
 *               (estilo Gmail: cada staff marca como lido individualmente).
 */
export type TicketKind = "support" | "general";
