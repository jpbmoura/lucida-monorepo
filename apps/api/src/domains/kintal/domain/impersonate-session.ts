import { ImpersonateSessionId } from "./impersonate-session-id.js";

export interface ImpersonateSessionProps {
  id: ImpersonateSessionId;
  /** Staff que iniciou o impersonate (sempre o realUser). */
  staffUserId: string;
  /** User cujo acesso é assumido. */
  targetUserId: string;
  startedAt: Date;
  /** `null` enquanto a sessão estiver ativa. Setado no stop. */
  stoppedAt: Date | null;
  /**
   * "manual" quando o staff clicou Sair, "expired" quando o cookie
   * expirou e o middleware fechou em background. Útil pro audit log.
   */
  stopReason: ImpersonateStopReason | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export type ImpersonateStopReason = "manual" | "expired" | "superseded";

/**
 * Sessão de impersonate iniciada por um staff. Imutável após criação a
 * menos do `stop()` (transição única open → closed). O audit log é
 * append-only — nunca apaga, só fecha.
 */
export class ImpersonateSession {
  private constructor(private readonly props: ImpersonateSessionProps) {}

  static create(input: {
    id: ImpersonateSessionId;
    staffUserId: string;
    targetUserId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    now?: Date;
  }): ImpersonateSession {
    if (!input.staffUserId.trim() || !input.targetUserId.trim()) {
      throw new Error("staffUserId e targetUserId são obrigatórios.");
    }
    if (input.staffUserId === input.targetUserId) {
      throw new Error("Staff não pode atuar como ele mesmo.");
    }
    return new ImpersonateSession({
      id: input.id,
      staffUserId: input.staffUserId,
      targetUserId: input.targetUserId,
      startedAt: input.now ?? new Date(),
      stoppedAt: null,
      stopReason: null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  }

  static restore(props: ImpersonateSessionProps): ImpersonateSession {
    return new ImpersonateSession({ ...props });
  }

  get id(): ImpersonateSessionId {
    return this.props.id;
  }
  get staffUserId(): string {
    return this.props.staffUserId;
  }
  get targetUserId(): string {
    return this.props.targetUserId;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get stoppedAt(): Date | null {
    return this.props.stoppedAt;
  }
  get stopReason(): ImpersonateStopReason | null {
    return this.props.stopReason;
  }
  get userAgent(): string | null {
    return this.props.userAgent;
  }
  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  isOpen(): boolean {
    return this.props.stoppedAt === null;
  }

  stop(reason: ImpersonateStopReason, now: Date = new Date()): void {
    if (this.props.stoppedAt !== null) return; // idempotente
    this.props.stoppedAt = now;
    this.props.stopReason = reason;
  }
}
