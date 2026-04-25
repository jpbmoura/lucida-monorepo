// Convites pendentes de uma organização. O fluxo de convidar/aceitar/cancelar
// é gerenciado pelo BA `organization` plugin via endpoints HTTP (client chama
// direto via authClient.organization.*). Este port existe só pra LEITURA no
// dashboard da instituição — quem precisa agregar invites com info do
// convidante (nome do inviter) pra renderizar a lista de "pendentes".

export interface PendingInvitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "canceled" | "rejected";
  invitedAt: Date;
  expiresAt: Date;
  /** Nome do user que mandou o convite (owner/admin). */
  inviterName: string;
  inviterEmail: string;
}

/**
 * Info pública mostrada na página /accept-invite ANTES do user se autenticar.
 * Não expõe nada sensível além do que já está no email enviado: nome da org,
 * quem convidou, pra qual email. Em teoria só quem recebeu o email tem o id.
 */
export interface InvitationPublicInfo {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "canceled" | "rejected";
  expiresAt: Date;
  organizationName: string;
  inviterName: string;
}

export interface OrganizationInvitationsRepository {
  /** Lista convites pendentes da org, mais recentes primeiro. */
  listPending(organizationId: string): Promise<PendingInvitation[]>;
  /** Info pública pra página de aceite. Retorna `null` se invite não existir. */
  getPublicInfo(invitationId: string): Promise<InvitationPublicInfo | null>;
}
