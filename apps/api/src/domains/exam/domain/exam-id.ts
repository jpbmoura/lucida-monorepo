export class ExamId {
  private constructor(private readonly raw: string) {}

  static of(value: string): ExamId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("ExamId não pode ser vazio");
    return new ExamId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: ExamId): boolean {
    return this.raw === other.raw;
  }
}
