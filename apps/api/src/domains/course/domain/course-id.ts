export class CourseId {
  private constructor(private readonly raw: string) {}

  static of(value: string): CourseId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("CourseId não pode ser vazio");
    return new CourseId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: CourseId): boolean {
    return this.raw === other.raw;
  }
}
