export class WalletId {
  private constructor(private readonly raw: string) {}

  static of(value: string): WalletId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("WalletId não pode ser vazio");
    return new WalletId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: WalletId): boolean {
    return this.raw === other.raw;
  }
}
