import type { ClassroomOAuthClient } from "./ports/classroom-oauth-client.js";
import { signClassroomOAuthState } from "./oauth-state.js";

interface Input {
  teacherId: string;
  organizationId: string | null;
}

interface Output {
  url: string;
}

/**
 * Monta a URL de consentimento do Google pro professor conectar a conta.
 * Embute um `state` assinado com a identidade dele — o callback público
 * valida e sabe de quem é, sem cookie cross-origin.
 */
export class BuildAuthorizeUrlUseCase {
  constructor(
    private readonly oauth: ClassroomOAuthClient,
    private readonly authSecret: string,
  ) {}

  async execute(input: Input): Promise<Output> {
    const state = signClassroomOAuthState(
      { userId: input.teacherId, organizationId: input.organizationId },
      this.authSecret,
    );
    return { url: this.oauth.buildConsentUrl(state) };
  }
}
