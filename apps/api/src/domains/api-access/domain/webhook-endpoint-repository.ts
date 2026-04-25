import type { WebhookEndpoint } from "./webhook-endpoint.js";
import type { WebhookEndpointId } from "./webhook-endpoint-id.js";

export interface WebhookEndpointRepository {
  nextId(): WebhookEndpointId;
  save(endpoint: WebhookEndpoint): Promise<void>;
  findById(id: WebhookEndpointId): Promise<WebhookEndpoint | null>;
  listByOrg(organizationId: string): Promise<WebhookEndpoint[]>;
  delete(id: WebhookEndpointId): Promise<void>;
}
