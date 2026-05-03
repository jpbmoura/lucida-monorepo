export class ImpersonateSessionId {
  private constructor(private readonly raw: string) {}

  static of(value: string): ImpersonateSessionId {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error("ImpersonateSessionId não pode ser vazio");
    return new ImpersonateSessionId(trimmed);
  }

  toString(): string {
    return this.raw;
  }

  equals(other: ImpersonateSessionId): boolean {
    return this.raw === other.raw;
  }
}
