/**
 * Descritores de audiência aceitos pelo SendNotificationUseCase. Resolver
 * traduz cada um numa lista de userIds (sempre user-level, mesmo broadcast).
 */
export type AudienceDescriptor =
  | { type: "user"; userId: string }
  | { type: "organization"; organizationId: string }
  | { type: "paying_customers" }
  | { type: "free_customers" }
  | { type: "all_customers" }
  /**
   * Usado por org_admin — resolver garante que o senderOrgId tem permissão.
   * O senderOrgId vem da sessão BA, não do payload (anti-spoofing).
   */
  | { type: "org_members"; organizationId: string };

export interface ResolvedAudience {
  /** Lista deduplicada de userIds que receberão a notificação. */
  recipientUserIds: string[];
  /** Rótulo amigável persistido no receipt pra exibição. */
  label: string;
}

export interface AudienceResolver {
  resolve(descriptor: AudienceDescriptor): Promise<ResolvedAudience>;
}
