export class InvoiceId {
  private constructor(private readonly raw: string) {}

  static of(value: string): InvoiceId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("InvoiceId não pode ser vazio");
    return new InvoiceId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: InvoiceId): boolean {
    return this.raw === other.raw;
  }
}
