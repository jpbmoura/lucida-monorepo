import type { RequestHandler } from "express";
import { AssistantActionForbiddenError } from "../../domain/teacher-assistant-errors.js";

/**
 * Bloqueia rotas sensíveis quando o user logado é auxiliar atuando como
 * professor. Só checa `req.auth.isAssistant` — admin org em modo
 * impersonate (cookie `lucida.impersonate`) NÃO é bloqueado, porque é o
 * próprio dono da org agindo de boa-fé.
 *
 * Aplicado em rotas de billing checkout (compra), troca de senha,
 * gestão de auxiliares e outras ações que pertencem ao professor titular.
 *
 * Pré-requisito: `requireAuth` precisa rodar antes (este middleware lê
 * `req.auth`). Devolve 403 com `code: ASSISTANT_ACTION_FORBIDDEN` —
 * frontend traduz pra mensagem amigável.
 */
export function denyAssistant(message?: string): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.isAssistant) {
      next(new AssistantActionForbiddenError(message));
      return;
    }
    next();
  };
}
