import { randomUUID } from "node:crypto";
import type { WebhookEndpointRepository } from "../domain/webhook-endpoint-repository.js";
import { WebhookEndpointId } from "../domain/webhook-endpoint-id.js";
import { WebhookEndpoint } from "../domain/webhook-endpoint.js";
import type { WebhookEvent } from "../domain/webhook-event.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import {
  WebhookEndpointModel,
  type WebhookEndpointDoc,
} from "./webhook-endpoint-schema.js";

export class MongooseWebhookEndpointRepository
  implements WebhookEndpointRepository
{
  nextId(): WebhookEndpointId {
    return WebhookEndpointId.of(randomUUID());
  }

  async save(endpoint: WebhookEndpoint): Promise<void> {
    await WebhookEndpointModel.updateOne(
      { _id: endpoint.id.toString() },
      {
        $set: {
          organizationId: endpoint.organizationId,
          url: endpoint.url,
          environment: endpoint.environment,
          events: endpoint.events,
          signingSecret: endpoint.signingSecret,
          enabled: endpoint.enabled,
          createdByUserId: endpoint.createdByUserId,
        },
        $setOnInsert: {
          _id: endpoint.id.toString(),
        },
      },
      { upsert: true },
    );
  }

  async findById(id: WebhookEndpointId): Promise<WebhookEndpoint | null> {
    const doc = await WebhookEndpointModel.findById(id.toString())
      .lean<WebhookEndpointDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async listByOrg(organizationId: string): Promise<WebhookEndpoint[]> {
    const docs = await WebhookEndpointModel.find({ organizationId })
      .lean<WebhookEndpointDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: WebhookEndpointId): Promise<void> {
    await WebhookEndpointModel.deleteOne({ _id: id.toString() }).exec();
  }
}

function toEntity(doc: WebhookEndpointDoc): WebhookEndpoint {
  return WebhookEndpoint.restore({
    id: WebhookEndpointId.of(doc._id),
    organizationId: doc.organizationId,
    url: doc.url,
    environment: doc.environment as ApiKeyEnvironment,
    events: doc.events as WebhookEvent[],
    signingSecret: doc.signingSecret,
    enabled: doc.enabled,
    createdByUserId: doc.createdByUserId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
