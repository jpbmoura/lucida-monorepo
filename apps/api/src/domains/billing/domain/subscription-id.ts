export class SubscriptionId {
  private constructor(private readonly raw: string) {}

  static of(value: string): SubscriptionId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("SubscriptionId não pode ser vazio");
    return new SubscriptionId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: SubscriptionId): boolean {
    return this.raw === other.raw;
  }
}
