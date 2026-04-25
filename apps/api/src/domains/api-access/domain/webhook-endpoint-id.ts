export class WebhookEndpointId {
  private constructor(private readonly value: string) {}

  static of(value: string): WebhookEndpointId {
    if (!value || typeof value !== "string") {
      throw new Error("WebhookEndpointId precisa ser string não-vazia.");
    }
    return new WebhookEndpointId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: WebhookEndpointId): boolean {
    return this.value === other.value;
  }
}
