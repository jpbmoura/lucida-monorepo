import { WebhookEndpointId } from "./webhook-endpoint-id.js";
import type { ApiKeyEnvironment } from "./api-key-environment.js";
import type { WebhookEvent } from "./webhook-event.js";

export interface WebhookEndpointProps {
  id: WebhookEndpointId;
  organizationId: string;
  url: string;
  environment: ApiKeyEnvironment;
  events: WebhookEvent[];
  /**
   * Segredo usado pra assinar o payload via HMAC-SHA256 nos webhooks
   * outbound (Fase C). Persistido em plaintext porque precisa ser usado
   * pra compor a assinatura em cada disparo. O parceiro valida o mesmo
   * secret do lado dele.
   */
  signingSecret: string;
  enabled: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Endpoint HTTP cadastrado pela instituição pra receber eventos. O
 * segredo é gerado no backend (nunca aceitamos do client) pra garantir
 * entropia. Pode ser rotacionado, mas só via chamada explícita — não é
 * algo que muda em updates normais de URL/events.
 */
export class WebhookEndpoint {
  private constructor(private props: WebhookEndpointProps) {}

  static create(input: {
    id: WebhookEndpointId;
    organizationId: string;
    url: string;
    environment: ApiKeyEnvironment;
    events: WebhookEvent[];
    signingSecret: string;
    createdByUserId: string;
    now?: Date;
  }): WebhookEndpoint {
    const now = input.now ?? new Date();
    return new WebhookEndpoint({
      id: input.id,
      organizationId: input.organizationId,
      url: input.url,
      environment: input.environment,
      events: [...input.events],
      signingSecret: input.signingSecret,
      enabled: true,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: WebhookEndpointProps): WebhookEndpoint {
    return new WebhookEndpoint({ ...props, events: [...props.events] });
  }

  update(input: {
    url?: string;
    events?: WebhookEvent[];
    enabled?: boolean;
    now?: Date;
  }): void {
    if (input.url !== undefined) this.props.url = input.url;
    if (input.events !== undefined) this.props.events = [...input.events];
    if (input.enabled !== undefined) this.props.enabled = input.enabled;
    this.props.updatedAt = input.now ?? new Date();
  }

  rotateSecret(newSecret: string, now: Date = new Date()): void {
    this.props.signingSecret = newSecret;
    this.props.updatedAt = now;
  }

  get id(): WebhookEndpointId {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get url(): string {
    return this.props.url;
  }
  get environment(): ApiKeyEnvironment {
    return this.props.environment;
  }
  get events(): WebhookEvent[] {
    return [...this.props.events];
  }
  get signingSecret(): string {
    return this.props.signingSecret;
  }
  get enabled(): boolean {
    return this.props.enabled;
  }
  get createdByUserId(): string {
    return this.props.createdByUserId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
