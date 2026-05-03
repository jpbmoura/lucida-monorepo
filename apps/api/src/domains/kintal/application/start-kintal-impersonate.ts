import type { ImpersonateSessionRepository } from "./ports/impersonate-session-repository.js";
import type { KintalUsersRepository } from "./ports/kintal-users-repository.js";
import { ImpersonateSession } from "../domain/impersonate-session.js";
import {
  CannotImpersonateSelfError,
  ImpersonateTargetNotFoundError,
} from "../domain/impersonate-errors.js";

export interface StartKintalImpersonateInput {
  staffUserId: string;
  targetUserId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface StartKintalImpersonateOutput {
  sessionId: string;
  targetUserId: string;
}

/**
 * Inicia uma sessão de impersonate de staff. Validações:
 *   - target existe na BA
 *   - target != staff (auto-impersonate proibido)
 *
 * Não há restrição por org — staff vê todo o sistema. Sessões anteriores
 * abertas pelo mesmo staff são fechadas como "superseded" pra manter
 * apenas uma ativa por vez (limpa cookie/sessão zumbi).
 */
export class StartKintalImpersonateUseCase {
  constructor(
    private readonly sessions: ImpersonateSessionRepository,
    private readonly users: KintalUsersRepository,
  ) {}

  async execute(
    input: StartKintalImpersonateInput,
  ): Promise<StartKintalImpersonateOutput> {
    if (input.staffUserId === input.targetUserId) {
      throw new CannotImpersonateSelfError();
    }

    const target = await this.users.findById(input.targetUserId);
    if (!target) throw new ImpersonateTargetNotFoundError();

    // Fecha sessão aberta anterior do mesmo staff (caso o cookie tenha
    // sido perdido sem chamar stop).
    const existing = await this.sessions.findOpenByStaff(input.staffUserId);
    if (existing) {
      existing.stop("superseded");
      await this.sessions.save(existing);
    }

    const session = ImpersonateSession.create({
      id: this.sessions.nextId(),
      staffUserId: input.staffUserId,
      targetUserId: input.targetUserId,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    await this.sessions.save(session);

    return {
      sessionId: session.id.toString(),
      targetUserId: input.targetUserId,
    };
  }
}
