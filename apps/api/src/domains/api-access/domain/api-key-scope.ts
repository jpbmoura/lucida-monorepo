/**
 * Permissões de uma API key. Cada escopo cobre um par (recurso, verbo).
 * A chave carrega uma lista de escopos concedidos na criação — rotas
 * públicas validam presença antes de permitir a ação.
 *
 * Novos escopos podem ser adicionados sem migração: chaves existentes
 * simplesmente não ganham o escopo novo até serem recriadas. Escopos
 * removidos viram no-op nas chaves antigas (não há rota pra honrá-los).
 */
export type ApiKeyScope =
  | "classes:read"
  | "classes:write"
  | "students:read"
  | "students:write"
  | "exams:read"
  | "exams:share"
  | "webhooks:manage";

export const ALL_API_KEY_SCOPES: readonly ApiKeyScope[] = [
  "classes:read",
  "classes:write",
  "students:read",
  "students:write",
  "exams:read",
  "exams:share",
  "webhooks:manage",
] as const;

export function isApiKeyScope(value: string): value is ApiKeyScope {
  return (ALL_API_KEY_SCOPES as readonly string[]).includes(value);
}
