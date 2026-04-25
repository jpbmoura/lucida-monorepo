export class LedgerEntryId {
  private constructor(private readonly raw: string) {}

  static of(value: string): LedgerEntryId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("LedgerEntryId não pode ser vazio");
    return new LedgerEntryId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: LedgerEntryId): boolean {
    return this.raw === other.raw;
  }
}
