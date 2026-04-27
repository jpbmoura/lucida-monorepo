import { NotificationId } from "./notification-id.js";
import type { Severity } from "./severity.js";

const TITLE_MAX = 120;
const BODY_MAX = 1_000;

export type SenderRole = "staff" | "org_admin" | "system";

export interface NotificationProps {
  id: NotificationId;
  recipientUserId: string;

  title: string;
  body: string;
  severity: Severity;
  /** URL de CTA opcional (interna ou externa). Click marca lida + navega. */
  link: string | null;

  readAt: Date | null;
  /** Quando o receiver dispensa, vira soft-hide do inbox próprio. */
  dismissedAt: Date | null;

  // Contexto do envio (denormalizado pra audit trail e campaign view).
  senderRole: SenderRole;
  senderUserId: string;
  /** Org context quando senderRole === "org_admin". */
  senderOrgId: string | null;

  /** Agrupador de receipts da mesma ação de envio (UUID). */
  campaignId: string;
  /** Rótulo amigável da audiência ("Todos pagantes", "Inst. X", etc.). */
  audienceLabel: string;

  createdAt: Date;
}

/**
 * Receipt de notificação — uma linha por destinatário (modelo fanout).
 * Imutável quanto ao conteúdo: depois de enviada, só `readAt`/`dismissedAt`
 * mudam. Pra retratar uma campanha, sender deleta a campaignId inteira.
 */
export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(input: {
    id: NotificationId;
    recipientUserId: string;
    title: string;
    body: string;
    severity: Severity;
    link?: string | null;
    senderRole: SenderRole;
    senderUserId: string;
    senderOrgId?: string | null;
    campaignId: string;
    audienceLabel: string;
    now?: Date;
  }): Notification {
    const title = sanitize(input.title, TITLE_MAX, "Título");
    const body = sanitize(input.body, BODY_MAX, "Corpo");
    return new Notification({
      id: input.id,
      recipientUserId: input.recipientUserId,
      title,
      body,
      severity: input.severity,
      link: input.link?.trim() || null,
      readAt: null,
      dismissedAt: null,
      senderRole: input.senderRole,
      senderUserId: input.senderUserId,
      senderOrgId: input.senderOrgId ?? null,
      campaignId: input.campaignId,
      audienceLabel: input.audienceLabel,
      createdAt: input.now ?? new Date(),
    });
  }

  static restore(props: NotificationProps): Notification {
    return new Notification({ ...props });
  }

  markAsRead(now: Date = new Date()): void {
    if (this.props.readAt) return;
    this.props.readAt = now;
  }

  dismiss(now: Date = new Date()): void {
    if (this.props.dismissedAt) return;
    this.props.dismissedAt = now;
  }

  get id(): NotificationId {
    return this.props.id;
  }
  get recipientUserId(): string {
    return this.props.recipientUserId;
  }
  get title(): string {
    return this.props.title;
  }
  get body(): string {
    return this.props.body;
  }
  get severity(): Severity {
    return this.props.severity;
  }
  get link(): string | null {
    return this.props.link;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }
  get dismissedAt(): Date | null {
    return this.props.dismissedAt;
  }
  get senderRole(): SenderRole {
    return this.props.senderRole;
  }
  get senderUserId(): string {
    return this.props.senderUserId;
  }
  get senderOrgId(): string | null {
    return this.props.senderOrgId;
  }
  get campaignId(): string {
    return this.props.campaignId;
  }
  get audienceLabel(): string {
    return this.props.audienceLabel;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}

function sanitize(raw: string, max: number, label: string): string {
  const t = raw.trim();
  if (t.length === 0) {
    throw new Error(`${label} não pode ser vazio.`);
  }
  if (t.length > max) {
    throw new Error(`${label} passou do limite de ${max} caracteres.`);
  }
  return t;
}
