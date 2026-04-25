import type { ApiKeyRepository } from "../domain/api-key-repository.js";
import type { ApiKeyGenerator } from "../domain/key-generator.js";
import { ApiKey } from "../domain/api-key.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import {
  ALL_API_KEY_SCOPES,
  isApiKeyScope,
  type ApiKeyScope,
} from "../domain/api-key-scope.js";
import { InvalidApiKeyScopesError } from "../domain/api-access-errors.js";

interface Input {
  organizationId: string;
  createdByUserId: string;
  name: string;
  environment: ApiKeyEnvironment;
  scopes: string[];
}

interface Output {
  /**
   * Plaintext completo da chave. **Só existe aqui uma vez** — caller é
   * responsável por entregar ao usuário e descartar da memória. Nunca
   * persistimos, nunca logamos.
   */
  plaintext: string;
  key: {
    id: string;
    name: string;
    environment: ApiKeyEnvironment;
    scopes: ApiKeyScope[];
    keyLastFour: string;
    createdAt: string;
  };
}

/**
 * Cria uma nova API key pra organização. Escopos vazios são permitidos
 * (chave "somente-leitura do futuro"), mas pelo menos zero inválidos: se
 * algum escopo desconhecido veio, falha antes de gerar material cripto.
 *
 * Não checamos duplicação de nome — duas chaves podem ter mesmo nome.
 * O id (ULID-like) + lastFour identificam unicamente na UI.
 */
export class CreateApiKeyUseCase {
  constructor(
    private readonly repo: ApiKeyRepository,
    private readonly generator: ApiKeyGenerator,
  ) {}

  async execute(input: Input): Promise<Output> {
    const scopes = validateScopes(input.scopes);

    const generated = this.generator.generate(input.environment);
    const key = ApiKey.create({
      id: this.repo.nextId(),
      organizationId: input.organizationId,
      name: input.name,
      environment: input.environment,
      scopes,
      keyHash: generated.hash,
      keyLastFour: generated.lastFour,
      createdByUserId: input.createdByUserId,
    });

    await this.repo.save(key);

    return {
      plaintext: generated.plaintext,
      key: {
        id: key.id.toString(),
        name: key.name,
        environment: key.environment,
        scopes: key.scopes,
        keyLastFour: key.keyLastFour,
        createdAt: key.createdAt.toISOString(),
      },
    };
  }
}

function validateScopes(raw: string[]): ApiKeyScope[] {
  const invalid = raw.filter((s) => !isApiKeyScope(s));
  if (invalid.length > 0) {
    throw new InvalidApiKeyScopesError(invalid);
  }
  // Dedupe mantendo a ordem do enum canônico — saída determinística na UI.
  const set = new Set(raw);
  return ALL_API_KEY_SCOPES.filter((s) => set.has(s));
}
