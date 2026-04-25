export class StudentId {
  private constructor(private readonly raw: string) {}

  static of(value: string): StudentId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("StudentId não pode ser vazio");
    return new StudentId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: StudentId): boolean {
    return this.raw === other.raw;
  }
}
