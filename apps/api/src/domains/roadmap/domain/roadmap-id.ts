export class RoadmapItemId {
  private constructor(private readonly raw: string) {}

  static of(value: string): RoadmapItemId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("RoadmapItemId não pode ser vazio");
    return new RoadmapItemId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: RoadmapItemId): boolean {
    return this.raw === other.raw;
  }
}
