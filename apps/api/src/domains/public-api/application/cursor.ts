import { DomainError } from "@/shared/errors/domain-error.js";

class InvalidCursorError extends DomainError {
  readonly code = "INVALID_CURSOR";
  readonly statusCode = 400;
  constructor() {
    super(
      "Cursor inválido. Use só o valor opaco devolvido em pageInfo.nextCursor da página anterior.",
    );
  }
}

/**
 * Helpers genéricos pra cursor opaco em rotas paginadas. O valor é
 * base64url(JSON({...})) — opacidade é convencional, não criptográfica.
 * Inspeções via DevTools são esperadas em dev, e o caller não depende
 * do conteúdo (não tem semântica externa).
 */

export function encodeCursor<T>(payload: T): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as T;
    return parsed;
  } catch {
    throw new InvalidCursorError();
  }
}
