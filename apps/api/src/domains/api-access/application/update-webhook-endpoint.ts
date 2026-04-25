import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import { WebhookEndpointId } from "../domain/webhook-endpoint-id.js";
import { WebhookEndpointNotFoundError } from "../domain/api-access-errors.js";
import { validateEvents, validateUrl } from "./create-webhook-endpoint.js";

interface Input {
  organizationId: string;
  endpointId: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
}

/**
 * Atualiza endpoint existente. Ambiente é imutável — pra mudar, revoga
 * e cria outro (evita que um endpoint `test` "graduate" pra live sem
 * nova rotação de secret, o que seria confuso pra auditoria).
 */
export class UpdateWebhookEndpointUseCase {
  constructor(private readonly repo: WebhookEndpointRepository) {}

  async execute(input: Input): Promise<void> {
    const endpoint = await this.repo.findById(
      WebhookEndpointId.of(input.endpointId),
    );
    if (!endpoint || endpoint.organizationId !== input.organizationId) {
      throw new WebhookEndpointNotFoundError();
    }
    const url =
      input.url !== undefined
        ? validateUrl(input.url, endpoint.environment)
        : undefined;
    const events =
      input.events !== undefined ? validateEvents(input.events) : undefined;
    endpoint.update({ url, events, enabled: input.enabled });
    await this.repo.save(endpoint);
  }
}
