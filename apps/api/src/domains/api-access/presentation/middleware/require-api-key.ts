import type { RequestHandler } from "express";
import { createHmac } from "node:crypto";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { ApiKeyEnvironment } from "../../domain/api-key-environment.js";
import type { ApiKeyScope } from "../../domain/api-key-scope.js";
import type { ApiKeyRepository } from "../../domain/api-key-repository.js";

/**
 * Contexto que cada rota pública vai consumir após `requireApiKey`. O id
 * fica de fora pra uso administrativo (logs); rotas usam `organizationId`,
 * `scopes` e `environment`.
 */
export interface ApiKeyContext {
  id: string;
  organizationId: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyContext;
    }
  }
}

class MissingBearerError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
  constructor() {
    super(
      "Header Authorization ausente ou malformado. Esperado: Authorization: Bearer <chave>.",
    );
  }
}

class InvalidBearerError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
  constructor() {
    super("Chave inválida ou revogada.");
  }
}

interface MakeRequireApiKeyDeps {
  repo: ApiKeyRepository;
  /** Mesmo secret usado pelo `HmacApiKeyGenerator` ao gerar/persistir. */
  authSecret: string;
}

/**
 * Middleware Bearer pra rotas `/v1/public/*`. Computa HMAC-SHA256 do
 * plaintext recebido com `AUTH_SECRET`, faz lookup pelo hash (índice
 * único O(1)), valida `revokedAt`, atualiza `lastUsedAt` (best-effort)
 * e decora `req.apiKey`.
 *
 * Não revela qual chave foi rejeitada (sempre 401 genérico) — não vaza
 * existência de chaves cross-org via timing.
 */
export function makeRequireApiKey({
  repo,
  authSecret,
}: MakeRequireApiKeyDeps): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.toLowerCase().startsWith("bearer ")) {
        throw new MissingBearerError();
      }
      const plaintext = header.slice("Bearer ".length).trim();
      if (plaintext.length === 0) {
        throw new MissingBearerError();
      }

      const hash = createHmac("sha256", authSecret)
        .update(plaintext)
        .digest("hex");

      const apiKey = await repo.findByHash(hash);
      if (!apiKey || apiKey.isRevoked()) {
        throw new InvalidBearerError();
      }

      // Best-effort — falhar aqui não bloqueia a request.
      apiKey.markUsed(new Date());
      repo.save(apiKey).catch(() => undefined);

      req.apiKey = {
        id: apiKey.id.toString(),
        organizationId: apiKey.organizationId,
        environment: apiKey.environment,
        scopes: apiKey.scopes,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
