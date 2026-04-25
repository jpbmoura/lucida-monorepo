import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import type { WebhookEvent } from "../domain/webhook-event.js";

interface Input {
  organizationId: string;
}

export interface WebhookEndpointDTO {
  id: string;
  url: string;
  environment: ApiKeyEnvironment;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lista endpoints da org. **Não** retorna `signingSecret` — ele só é
 * revelado no momento da criação (ou de um rotate). Quem perder o
 * secret precisa rotacionar, não há recuperação.
 */
export class ListWebhookEndpointsUseCase {
  constructor(private readonly repo: WebhookEndpointRepository) {}

  async execute(input: Input): Promise<WebhookEndpointDTO[]> {
    const endpoints = await this.repo.listByOrg(input.organizationId);
    return endpoints
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((e) => ({
        id: e.id.toString(),
        url: e.url,
        environment: e.environment,
        events: e.events,
        enabled: e.enabled,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));
  }
}
