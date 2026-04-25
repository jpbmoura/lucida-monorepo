import type { ApiKeyRepository } from "../domain/api-key-repository.js";
import { ApiKeyId } from "../domain/api-key-id.js";
import { ApiKeyNotFoundError } from "../domain/api-access-errors.js";

interface Input {
  organizationId: string;
  keyId: string;
}

/**
 * Revoga uma chave. Idempotente por efeito (chamar duas vezes não
 * derruba — a segunda vira no-op), mas retorna erro específico pra UI
 * não mostrar "revogada com sucesso" quando já estava revogada.
 *
 * Valida que a chave pertence à org do caller pra evitar cross-org
 * revocation — mesmo que o id vaze, admin de outra org não consegue
 * derrubar chave alheia.
 */
export class RevokeApiKeyUseCase {
  constructor(private readonly repo: ApiKeyRepository) {}

  async execute(input: Input): Promise<void> {
    const key = await this.repo.findById(ApiKeyId.of(input.keyId));
    if (!key || key.organizationId !== input.organizationId) {
      throw new ApiKeyNotFoundError();
    }
    if (key.isRevoked()) {
      // Idempotente — não lança `ApiKeyAlreadyRevokedError` aqui. Caller
      // pediu revogação, chave tá revogada, contrato atendido.
      return;
    }
    key.revoke();
    await this.repo.save(key);
  }
}
