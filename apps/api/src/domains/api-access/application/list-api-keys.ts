import type { ApiKeyRepository } from "../domain/api-key-repository.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import type { ApiKeyScope } from "../domain/api-key-scope.js";

interface Input {
  organizationId: string;
  includeRevoked?: boolean;
}

export interface ApiKeyDTO {
  id: string;
  name: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  keyLastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export class ListApiKeysUseCase {
  constructor(private readonly repo: ApiKeyRepository) {}

  async execute(input: Input): Promise<ApiKeyDTO[]> {
    const keys = await this.repo.listByOrg(input.organizationId, {
      includeRevoked: input.includeRevoked ?? false,
    });
    return keys
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((k) => ({
        id: k.id.toString(),
        name: k.name,
        environment: k.environment,
        scopes: k.scopes,
        keyLastFour: k.keyLastFour,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
      }));
  }
}
