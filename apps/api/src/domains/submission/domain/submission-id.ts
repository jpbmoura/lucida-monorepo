export class SubmissionId {
  private constructor(private readonly raw: string) {}

  static of(value: string): SubmissionId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("SubmissionId não pode ser vazio");
    return new SubmissionId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: SubmissionId): boolean {
    return this.raw === other.raw;
  }
}
