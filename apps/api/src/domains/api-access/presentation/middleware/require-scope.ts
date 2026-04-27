import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { ApiKeyScope } from "../../domain/api-key-scope.js";

class InsufficientScopeError extends DomainError {
  readonly code = "INSUFFICIENT_SCOPE";
  readonly statusCode = 403;
  constructor(required: ApiKeyScope) {
    super(
      `A chave usada não tem o escopo necessário (${required}). Crie uma nova chave com esse escopo no painel de desenvolvedores.`,
    );
  }
}

/**
 * Factory que produz middleware exigindo um escopo específico. Encadeie
 * SEMPRE depois do `requireApiKey` — depende do `req.apiKey` decorado.
 *
 * Crash explícito (não 401) se chegar aqui sem `req.apiKey` — significa
 * misconfig de rota. Melhor falhar ruidoso do que liberar request sem
 * auth.
 */
export function makeRequireScope(required: ApiKeyScope): RequestHandler {
  return (req, _res, next) => {
    if (!req.apiKey) {
      next(
        new Error(
          "requireScope chamado sem apiKey decorado. Encadeie depois de requireApiKey.",
        ),
      );
      return;
    }
    if (!req.apiKey.scopes.includes(required)) {
      next(new InsufficientScopeError(required));
      return;
    }
    next();
  };
}
