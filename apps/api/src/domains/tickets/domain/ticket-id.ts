export class TicketId {
  private constructor(private readonly raw: string) {}

  static of(value: string): TicketId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("TicketId não pode ser vazio");
    return new TicketId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: TicketId): boolean {
    return this.raw === other.raw;
  }
}
