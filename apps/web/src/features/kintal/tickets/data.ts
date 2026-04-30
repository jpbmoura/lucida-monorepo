import "server-only";
import { apiFetch } from "@/lib/api-client";

export type TicketKind = "support" | "general";
export type TicketStatus = "open" | "closed";
export type TicketOrigin = "email" | "form";
export type TicketMessageDirection = "inbound" | "outbound";
export type TicketMessageKind = "manual" | "auto";

export interface TicketAttachmentDTO {
  filename: string;
  size: number;
  contentType: string;
  providerUrl: string;
}

export interface TicketMessageDTO {
  id: string;
  direction: TicketMessageDirection;
  kind: TicketMessageKind;
  fromEmail: string;
  fromName: string | null;
  bodyText: string;
  bodyHtml: string | null;
  attachments: TicketAttachmentDTO[];
  createdAt: string;
}

export interface TicketLastMessagePreview {
  direction: TicketMessageDirection;
  kind: TicketMessageKind;
  textSnippet: string;
  createdAt: string;
}

export interface TicketListItemDTO {
  id: string;
  kind: TicketKind;
  subject: string;
  status: TicketStatus;
  customerEmail: string;
  customerName: string | null;
  origin: TicketOrigin;
  awaitingStaff: boolean;
  /** Lido por mim — relevante em kind=general (caixa de entrada). */
  readByMe: boolean;
  lastMessagePreview: TicketLastMessagePreview | null;
  messagesCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TicketDetailDTO extends TicketListItemDTO {
  userId: string | null;
  messages: TicketMessageDTO[];
}

export interface TicketsListResponse {
  items: TicketListItemDTO[];
  counts: {
    open: number;
    closed: number;
    /** Quantos da inbox geral o user atual ainda não leu. */
    unreadInbox?: number;
  };
}

export interface FetchTicketsOptions {
  kind?: TicketKind;
  status?: TicketStatus;
  unreadOnly?: boolean;
}

export async function fetchTickets(
  opts: FetchTicketsOptions = {},
): Promise<TicketsListResponse> {
  const params = new URLSearchParams();
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.status) params.set("status", opts.status);
  if (opts.unreadOnly) params.set("unreadOnly", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiFetch<{ data: TicketsListResponse }>(
    `/v1/tickets${qs}`,
  );
  return res.data;
}

export async function fetchTicket(id: string): Promise<TicketDetailDTO> {
  const res = await apiFetch<{ data: TicketDetailDTO }>(
    `/v1/tickets/${encodeURIComponent(id)}`,
  );
  return res.data;
}
