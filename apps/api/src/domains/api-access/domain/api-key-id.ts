/**
 * Wrapper nominal pro id da API key. Segue o mesmo padrão de `WalletId`
 * do billing: encapsula a string bruta pra evitar passar userId / orgId
 * em posições que esperam keyId.
 */
export class ApiKeyId {
  private constructor(private readonly value: string) {}

  static of(value: string): ApiKeyId {
    if (!value || typeof value !== "string") {
      throw new Error("ApiKeyId precisa ser string não-vazia.");
    }
    return new ApiKeyId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ApiKeyId): boolean {
    return this.value === other.value;
  }
}
