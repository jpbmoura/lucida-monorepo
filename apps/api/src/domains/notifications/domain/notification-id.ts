export class NotificationId {
  private constructor(private readonly raw: string) {}

  static of(value: string): NotificationId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("NotificationId não pode ser vazio");
    return new NotificationId(trimmed);
  }

  toString(): string {
    return this.raw;
  }
}
