import { ApiKeyId } from "./api-key-id.js";
import type { ApiKeyEnvironment } from "./api-key-environment.js";
import type { ApiKeyScope } from "./api-key-scope.js";
import { ApiKeyAlreadyRevokedError } from "./api-access-errors.js";

export interface ApiKeyProps {
  id: ApiKeyId;
  organizationId: string;
  name: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  /** HMAC-SHA256(plaintext, AUTH_SECRET) em hex. */
  keyHash: string;
  /** Últimos 4 chars do plaintext — só pra UI distinguir chaves. */
  keyLastFour: string;
  createdByUserId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

/**
 * Chave de API institucional. O plaintext nunca fica no banco — só o
 * hash. Revogação é soft (grava `revokedAt`); nunca apagamos o registro
 * pra manter rastro histórico de quem usou a chave e quando.
 *
 * Ciclo de vida:
 *   create → (uso via /v1/public/* na Fase B atualiza lastUsedAt)
 *          → revoke (final)
 *
 * Não há rotação automática — pra rotacionar, cria-se uma nova chave
 * e revoga-se a antiga (duas operações distintas, duas ledger trails).
 */
export class ApiKey {
  private constructor(private props: ApiKeyProps) {}

  static create(input: {
    id: ApiKeyId;
    organizationId: string;
    name: string;
    environment: ApiKeyEnvironment;
    scopes: ApiKeyScope[];
    keyHash: string;
    keyLastFour: string;
    createdByUserId: string;
    now?: Date;
  }): ApiKey {
    const now = input.now ?? new Date();
    return new ApiKey({
      id: input.id,
      organizationId: input.organizationId,
      name: input.name.trim(),
      environment: input.environment,
      scopes: [...input.scopes],
      keyHash: input.keyHash,
      keyLastFour: input.keyLastFour,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    });
  }

  static restore(props: ApiKeyProps): ApiKey {
    return new ApiKey({ ...props, scopes: [...props.scopes] });
  }

  revoke(now: Date = new Date()): void {
    if (this.props.revokedAt) {
      throw new ApiKeyAlreadyRevokedError();
    }
    this.props.revokedAt = now;
  }

  markUsed(now: Date = new Date()): void {
    this.props.lastUsedAt = now;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  hasScope(scope: ApiKeyScope): boolean {
    return this.props.scopes.includes(scope);
  }

  get id(): ApiKeyId {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get name(): string {
    return this.props.name;
  }
  get environment(): ApiKeyEnvironment {
    return this.props.environment;
  }
  get scopes(): ApiKeyScope[] {
    return [...this.props.scopes];
  }
  get keyHash(): string {
    return this.props.keyHash;
  }
  get keyLastFour(): string {
    return this.props.keyLastFour;
  }
  get createdByUserId(): string {
    return this.props.createdByUserId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get lastUsedAt(): Date | null {
    return this.props.lastUsedAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
}
