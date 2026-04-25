import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import { WebhookEndpointId } from "../domain/webhook-endpoint-id.js";
import { WebhookEndpointNotFoundError } from "../domain/api-access-errors.js";

interface Input {
  organizationId: string;
  endpointId: string;
}

/**
 * Delete físico. Endpoints não têm histórico próprio pra preservar
 * (histórico de entregas vai pra `webhook_deliveries` na Fase C, que
 * fica referenciando o endpointId mesmo após o delete — consulta
 * continua funcionando com nome "endpoint removido").
 */
export class DeleteWebhookEndpointUseCase {
  constructor(private readonly repo: WebhookEndpointRepository) {}

  async execute(input: Input): Promise<void> {
    const id = WebhookEndpointId.of(input.endpointId);
    const endpoint = await this.repo.findById(id);
    if (!endpoint || endpoint.organizationId !== input.organizationId) {
      throw new WebhookEndpointNotFoundError();
    }
    await this.repo.delete(id);
  }
}
