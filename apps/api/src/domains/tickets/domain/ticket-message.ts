/**
 * Mensagem dentro de um ticket. Tanto inbound (cliente) quanto outbound
 * (staff/auto-resposta). Identificada por UUID local pra threading
 * server-side; o `providerMessageId` guarda o ID do provider (Resend
 * pra outbound, header Message-ID original pra inbound).
 */

export type TicketMessageDirection = "inbound" | "outbound";

/**
 * `manual` → escrita por humano (staff resposta, ou cliente).
 * `auto`   → enviada automaticamente pelo sistema (auto-resposta de
 *            "recebemos seu email"). UI pode renderizar diferente.
 */
export type TicketMessageKind = "manual" | "auto";

export interface TicketAttachment {
  filename: string;
  size: number;
  contentType: string;
  /** URL pública do provider (Resend mantém arquivos por X dias). */
  providerUrl: string;
}

export interface TicketMessageProps {
  id: string;
  direction: TicketMessageDirection;
  kind: TicketMessageKind;
  fromEmail: string;
  fromName: string | null;
  bodyText: string;
  bodyHtml: string | null;
  /**
   * ID que o provider associa à mensagem.
   *  - outbound: ID retornado pelo Resend send (`re_...`)
   *  - inbound: header `Message-ID` original do email recebido
   *
   * Pra outbound vem null inicialmente e é preenchido após o send
   * concluir; o ticket é salvo idempotentemente.
   */
  providerMessageId: string | null;
  /** Header In-Reply-To do email (inbound) — usado pra correlacionar. */
  inReplyTo: string | null;
  attachments: TicketAttachment[];
  createdAt: Date;
}

export class TicketMessage {
  private constructor(private props: TicketMessageProps) {}

  static create(input: {
    id: string;
    direction: TicketMessageDirection;
    kind?: TicketMessageKind;
    fromEmail: string;
    fromName?: string | null;
    bodyText: string;
    bodyHtml?: string | null;
    providerMessageId?: string | null;
    inReplyTo?: string | null;
    attachments?: TicketAttachment[];
    now?: Date;
  }): TicketMessage {
    return new TicketMessage({
      id: input.id,
      direction: input.direction,
      kind: input.kind ?? "manual",
      fromEmail: input.fromEmail,
      fromName: input.fromName ?? null,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      providerMessageId: input.providerMessageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      attachments: input.attachments ?? [],
      createdAt: input.now ?? new Date(),
    });
  }

  static restore(props: TicketMessageProps): TicketMessage {
    return new TicketMessage({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get direction(): TicketMessageDirection {
    return this.props.direction;
  }
  get kind(): TicketMessageKind {
    return this.props.kind;
  }
  get fromEmail(): string {
    return this.props.fromEmail;
  }
  get fromName(): string | null {
    return this.props.fromName;
  }
  get bodyText(): string {
    return this.props.bodyText;
  }
  get bodyHtml(): string | null {
    return this.props.bodyHtml;
  }
  get providerMessageId(): string | null {
    return this.props.providerMessageId;
  }
  get inReplyTo(): string | null {
    return this.props.inReplyTo;
  }
  get attachments(): TicketAttachment[] {
    return this.props.attachments;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  setProviderMessageId(id: string): void {
    this.props.providerMessageId = id;
  }

  toProps(): TicketMessageProps {
    return { ...this.props, attachments: [...this.props.attachments] };
  }
}
