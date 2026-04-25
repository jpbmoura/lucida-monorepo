import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import type { WebhookSecretGenerator } from "../domain/key-generator.js";
import { WebhookEndpoint } from "../domain/webhook-endpoint.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import {
  ALL_WEBHOOK_EVENTS,
  isWebhookEvent,
  type WebhookEvent,
} from "../domain/webhook-event.js";
import {
  InvalidWebhookEventsError,
  InvalidWebhookUrlError,
} from "../domain/api-access-errors.js";

interface Input {
  organizationId: string;
  createdByUserId: string;
  url: string;
  environment: ApiKeyEnvironment;
  events: string[];
}

interface Output {
  /**
   * Signing secret em plaintext. **Só retornado aqui na criação** (e
   * novamente em rotate). Caller mostra ao usuário pra copiar — depois a
   * UI não expõe mais.
   */
  signingSecret: string;
  endpoint: {
    id: string;
    url: string;
    environment: ApiKeyEnvironment;
    events: WebhookEvent[];
    enabled: boolean;
    createdAt: string;
  };
}

/**
 * Cria um endpoint de webhook. Valida URL e eventos antes de gerar
 * segredo — assim payload inválido não gasta entropia à toa.
 */
export class CreateWebhookEndpointUseCase {
  constructor(
    private readonly repo: WebhookEndpointRepository,
    private readonly secrets: WebhookSecretGenerator,
  ) {}

  async execute(input: Input): Promise<Output> {
    const url = validateUrl(input.url, input.environment);
    const events = validateEvents(input.events);

    const signingSecret = this.secrets.generate();
    const endpoint = WebhookEndpoint.create({
      id: this.repo.nextId(),
      organizationId: input.organizationId,
      url,
      environment: input.environment,
      events,
      signingSecret,
      createdByUserId: input.createdByUserId,
    });
    await this.repo.save(endpoint);

    return {
      signingSecret,
      endpoint: {
        id: endpoint.id.toString(),
        url: endpoint.url,
        environment: endpoint.environment,
        events: endpoint.events,
        enabled: endpoint.enabled,
        createdAt: endpoint.createdAt.toISOString(),
      },
    };
  }
}

export function validateUrl(
  raw: string,
  environment: ApiKeyEnvironment,
): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidWebhookUrlError("URL inválida.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new InvalidWebhookUrlError(
      "Apenas URLs http(s) são aceitas.",
    );
  }
  if (environment === "live" && parsed.protocol !== "https:") {
    throw new InvalidWebhookUrlError(
      "Endpoints de produção precisam ser HTTPS.",
    );
  }
  if (
    parsed.protocol === "http:" &&
    environment === "test" &&
    !isLocalhost(parsed.hostname)
  ) {
    throw new InvalidWebhookUrlError(
      "HTTP só é aceito em endpoints de teste apontando pra localhost.",
    );
  }
  return trimmed;
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

export function validateEvents(raw: string[]): WebhookEvent[] {
  const invalid = raw.filter((e) => !isWebhookEvent(e));
  if (invalid.length > 0) {
    throw new InvalidWebhookEventsError(invalid);
  }
  const set = new Set(raw);
  return ALL_WEBHOOK_EVENTS.filter((e) => set.has(e));
}
