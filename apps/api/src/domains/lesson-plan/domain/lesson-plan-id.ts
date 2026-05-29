export class LessonPlanId {
  private constructor(private readonly raw: string) {}

  static of(value: string): LessonPlanId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("LessonPlanId não pode ser vazio");
    return new LessonPlanId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: LessonPlanId): boolean {
    return this.raw === other.raw;
  }
}
