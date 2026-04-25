export class ScanId {
  private constructor(private readonly raw: string) {}

  static of(value: string): ScanId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("ScanId não pode ser vazio");
    return new ScanId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: ScanId): boolean {
    return this.raw === other.raw;
  }
}
