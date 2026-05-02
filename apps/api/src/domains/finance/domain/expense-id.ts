export class ExpenseId {
  private constructor(private readonly raw: string) {}

  static of(value: string): ExpenseId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("ExpenseId não pode ser vazio");
    return new ExpenseId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: ExpenseId): boolean {
    return this.raw === other.raw;
  }
}
