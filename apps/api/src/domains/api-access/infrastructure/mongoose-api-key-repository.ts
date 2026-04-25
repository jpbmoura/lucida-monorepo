import { randomUUID } from "node:crypto";
import type { ApiKeyRepository } from "../domain/api-key-repository.js";
import { ApiKeyId } from "../domain/api-key-id.js";
import { ApiKey } from "../domain/api-key.js";
import type { ApiKeyScope } from "../domain/api-key-scope.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";
import { ApiKeyModel, type ApiKeyDoc } from "./api-key-schema.js";

export class MongooseApiKeyRepository implements ApiKeyRepository {
  nextId(): ApiKeyId {
    return ApiKeyId.of(randomUUID());
  }

  async save(key: ApiKey): Promise<void> {
    await ApiKeyModel.updateOne(
      { _id: key.id.toString() },
      {
        $set: {
          organizationId: key.organizationId,
          name: key.name,
          environment: key.environment,
          scopes: key.scopes,
          keyHash: key.keyHash,
          keyLastFour: key.keyLastFour,
          createdByUserId: key.createdByUserId,
          lastUsedAt: key.lastUsedAt,
          revokedAt: key.revokedAt,
        },
        $setOnInsert: {
          _id: key.id.toString(),
        },
      },
      { upsert: true },
    );
  }

  async findById(id: ApiKeyId): Promise<ApiKey | null> {
    const doc = await ApiKeyModel.findById(id.toString())
      .lean<ApiKeyDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const doc = await ApiKeyModel.findOne({ keyHash })
      .lean<ApiKeyDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async listByOrg(
    organizationId: string,
    options: { includeRevoked?: boolean } = {},
  ): Promise<ApiKey[]> {
    const filter: Record<string, unknown> = { organizationId };
    if (!options.includeRevoked) filter.revokedAt = null;
    const docs = await ApiKeyModel.find(filter).lean<ApiKeyDoc[]>().exec();
    return docs.map(toEntity);
  }
}

function toEntity(doc: ApiKeyDoc): ApiKey {
  return ApiKey.restore({
    id: ApiKeyId.of(doc._id),
    organizationId: doc.organizationId,
    name: doc.name,
    environment: doc.environment as ApiKeyEnvironment,
    scopes: doc.scopes as ApiKeyScope[],
    keyHash: doc.keyHash,
    keyLastFour: doc.keyLastFour,
    createdByUserId: doc.createdByUserId,
    createdAt: doc.createdAt,
    lastUsedAt: doc.lastUsedAt,
    revokedAt: doc.revokedAt,
  });
}
