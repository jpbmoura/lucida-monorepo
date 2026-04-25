import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import type { WebhookSecretGenerator } from "../domain/key-generator.js";
import { WebhookEndpointId } from "../domain/webhook-endpoint-id.js";
import { WebhookEndpointNotFoundError } from "../domain/api-access-errors.js";

interface Input {
  organizationId: string;
  endpointId: string;
}

interface Output {
  /**
   * Novo signing secret em plaintext — retornado uma única vez. Até o
   * parceiro atualizar do lado dele, disparos vão continuar assinando com
   * o secret antigo (porque o update-then-save deste use case só troca
   * o valor no banco, e a Fase C lê o valor atualizado a cada disparo).
   * Caller é responsável por entregar ao usuário e orientá-lo a avisar
   * o parceiro.
   */
  signingSecret: string;
}

export class RotateWebhookSecretUseCase {
  constructor(
    private readonly repo: WebhookEndpointRepository,
    private readonly secrets: WebhookSecretGenerator,
  ) {}

  async execute(input: Input): Promise<Output> {
    const endpoint = await this.repo.findById(
      WebhookEndpointId.of(input.endpointId),
    );
    if (!endpoint || endpoint.organizationId !== input.organizationId) {
      throw new WebhookEndpointNotFoundError();
    }
    const next = this.secrets.generate();
    endpoint.rotateSecret(next);
    await this.repo.save(endpoint);
    return { signingSecret: next };
  }
}
