import type { ApiKey } from "./api-key.js";
import type { ApiKeyId } from "./api-key-id.js";

export interface ApiKeyRepository {
  nextId(): ApiKeyId;
  save(key: ApiKey): Promise<void>;
  findById(id: ApiKeyId): Promise<ApiKey | null>;
  /**
   * Busca por hash — usado pelo middleware público (Fase B) ao receber
   * `Authorization: Bearer ...`. O caller já computou o hash antes de
   * chamar, então aqui é só lookup direto pelo índice único.
   */
  findByHash(keyHash: string): Promise<ApiKey | null>;
  /**
   * Lista por organização. `includeRevoked=false` (default) filtra
   * revogadas — UI principal mostra só ativas, histórico tem query
   * separada quando precisar.
   */
  listByOrg(
    organizationId: string,
    options?: { includeRevoked?: boolean },
  ): Promise<ApiKey[]>;
}
