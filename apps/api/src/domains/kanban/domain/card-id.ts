export class CardId {
  private constructor(private readonly raw: string) {}

  static of(value: string): CardId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("CardId não pode ser vazio");
    return new CardId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: CardId): boolean {
    return this.raw === other.raw;
  }
}
