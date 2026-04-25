// Porta para operações transacionais sobre um convite que não dá pra expor
// via BA client direto: criar user + marcar email verificado + associar à
// org + marcar invite aceito — tudo de uma vez. Usado em /accept-invite
// quando o convidado ainda não tem conta.

export type AcceptInviteWithSignupError =
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_EXPIRED"
  | "USER_ALREADY_EXISTS"
  | "SIGNUP_FAILED";

export interface AcceptInviteWithSignupInput {
  invitationId: string;
  name: string;
  password: string;
}

export interface AcceptInviteWithSignupOutput {
  userId: string;
  email: string;
}

export interface InvitationAcceptor {
  /**
   * Cria user, força `emailVerified=true` (o convite provou posse do email),
   * associa à organização como member no role do invite, marca o invite
   * como aceito. Throws `DomainError` com code tipado em `AcceptInviteWithSignupError`.
   */
  signupAndAccept(
    input: AcceptInviteWithSignupInput,
  ): Promise<AcceptInviteWithSignupOutput>;
}
