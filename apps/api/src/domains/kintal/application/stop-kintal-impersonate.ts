import type { ImpersonateSessionRepository } from "./ports/impersonate-session-repository.js";
import type { ImpersonateStopReason } from "../domain/impersonate-session.js";

export interface StopKintalImpersonateInput {
  staffUserId: string;
  reason?: ImpersonateStopReason;
}

/**
 * Encerra a sessão de impersonate aberta do staff. Idempotente — se não
 * há sessão aberta, retorna ok sem efeito. O caller (controller) limpa
 * o cookie independente.
 */
export class StopKintalImpersonateUseCase {
  constructor(
    private readonly sessions: ImpersonateSessionRepository,
  ) {}

  async execute(input: StopKintalImpersonateInput): Promise<void> {
    const open = await this.sessions.findOpenByStaff(input.staffUserId);
    if (!open) return;
    open.stop(input.reason ?? "manual");
    await this.sessions.save(open);
  }
}
