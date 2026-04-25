import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { CreateApiKeyUseCase } from "../application/create-api-key.js";
import type { ListApiKeysUseCase } from "../application/list-api-keys.js";
import type { RevokeApiKeyUseCase } from "../application/revoke-api-key.js";
import type { CreateWebhookEndpointUseCase } from "../application/create-webhook-endpoint.js";
import type { ListWebhookEndpointsUseCase } from "../application/list-webhook-endpoints.js";
import type { UpdateWebhookEndpointUseCase } from "../application/update-webhook-endpoint.js";
import type { RotateWebhookSecretUseCase } from "../application/rotate-webhook-secret.js";
import type { DeleteWebhookEndpointUseCase } from "../application/delete-webhook-endpoint.js";
import { ALL_API_KEY_SCOPES } from "../domain/api-key-scope.js";
import { ALL_WEBHOOK_EVENTS } from "../domain/webhook-event.js";
import {
  apiKeyIdParam,
  createApiKeyBody,
  createWebhookEndpointBody,
  updateWebhookEndpointBody,
  webhookIdParam,
} from "./api-access-schemas.js";

interface Deps {
  createApiKey: CreateApiKeyUseCase;
  listApiKeys: ListApiKeysUseCase;
  revokeApiKey: RevokeApiKeyUseCase;
  createWebhookEndpoint: CreateWebhookEndpointUseCase;
  listWebhookEndpoints: ListWebhookEndpointsUseCase;
  updateWebhookEndpoint: UpdateWebhookEndpointUseCase;
  rotateWebhookSecret: RotateWebhookSecretUseCase;
  deleteWebhookEndpoint: DeleteWebhookEndpointUseCase;
}

class MissingActiveOrganizationError extends DomainError {
  readonly code = "MISSING_ACTIVE_ORGANIZATION";
  readonly statusCode = 400;
  constructor() {
    super(
      "Nenhuma organização ativa na sessão. Selecione uma antes de gerenciar chaves ou webhooks.",
    );
  }
}

export class ApiAccessController {
  constructor(private readonly deps: Deps) {}

  /**
   * Metadata estática pra popular a UI (checkboxes de scopes/eventos)
   * sem hardcodar no frontend. Evita drift — se adicionarmos escopo
   * novo no backend, a UI reflete automaticamente.
   */
  metadata: RequestHandler = async (_req, res, next) => {
    try {
      res.json({
        data: {
          scopes: ALL_API_KEY_SCOPES,
          events: ALL_WEBHOOK_EVENTS,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // --- API keys ---

  listKeys: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const includeRevoked =
        typeof req.query.includeRevoked === "string" &&
        req.query.includeRevoked === "true";
      const data = await this.deps.listApiKeys.execute({
        organizationId: orgId,
        includeRevoked,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createKey: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const body = createApiKeyBody.parse(req.body);
      const result = await this.deps.createApiKey.execute({
        organizationId: orgId,
        createdByUserId: req.auth!.userId,
        name: body.name,
        environment: body.environment,
        scopes: body.scopes,
      });
      // 201 pra sinalizar criação. Caller usa o plaintext uma vez.
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeKey: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = apiKeyIdParam.parse(req.params);
      await this.deps.revokeApiKey.execute({
        organizationId: orgId,
        keyId: id,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  // --- Webhook endpoints ---

  listEndpoints: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const data = await this.deps.listWebhookEndpoints.execute({
        organizationId: orgId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createEndpoint: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const body = createWebhookEndpointBody.parse(req.body);
      const result = await this.deps.createWebhookEndpoint.execute({
        organizationId: orgId,
        createdByUserId: req.auth!.userId,
        url: body.url,
        environment: body.environment,
        events: body.events,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateEndpoint: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = webhookIdParam.parse(req.params);
      const body = updateWebhookEndpointBody.parse(req.body);
      await this.deps.updateWebhookEndpoint.execute({
        organizationId: orgId,
        endpointId: id,
        url: body.url,
        events: body.events,
        enabled: body.enabled,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  rotateEndpointSecret: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = webhookIdParam.parse(req.params);
      const result = await this.deps.rotateWebhookSecret.execute({
        organizationId: orgId,
        endpointId: id,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  deleteEndpoint: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = webhookIdParam.parse(req.params);
      await this.deps.deleteWebhookEndpoint.execute({
        organizationId: orgId,
        endpointId: id,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
