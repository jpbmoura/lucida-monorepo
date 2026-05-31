export class SlideDeckId {
  private constructor(private readonly raw: string) {}

  static of(value: string): SlideDeckId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("SlideDeckId não pode ser vazio");
    return new SlideDeckId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: SlideDeckId): boolean {
    return this.raw === other.raw;
  }
}
