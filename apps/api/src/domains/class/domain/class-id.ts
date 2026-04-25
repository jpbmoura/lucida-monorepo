export class ClassId {
  private constructor(private readonly raw: string) {}

  static of(value: string): ClassId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("ClassId não pode ser vazio");
    return new ClassId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: ClassId): boolean {
    return this.raw === other.raw;
  }
}
