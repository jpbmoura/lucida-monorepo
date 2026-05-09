/**
 * Status do ticket (= conversa de email com o cliente).
 *
 *  - new          → recebido, ainda ninguém da equipe respondeu nem
 *                   moveu manualmente. É o estado inicial.
 *  - in_progress  → equipe assumiu (respondeu pelo menos uma vez OU
 *                   reabriu um done/read explicitamente). É também o
 *                   estado pra qual auto-volta quando cliente responde
 *                   um done/read.
 *  - done         → resolvido após uma ação real do staff (respondeu
 *                   e fechou). Cliente que responder reabre como
 *                   in_progress (preserva histórico).
 *  - read         → arquivado sem precisar responder (notificações
 *                   automáticas, marketing, spam). Terminal igual a
 *                   `done`, mas separado pra distinguir métricas e
 *                   propósito. Mesma regra de auto-reabertura quando
 *                   cliente responde.
 */
export type TicketStatus = "new" | "in_progress" | "done" | "read";
