import "server-only";
import { apiFetch } from "@/lib/api-client";

export type TicketStatus = "new" | "in_progress" | "done" | "read";
export type TicketBox = "inbox" | "outbox";
export type TicketOrigin = "email" | "form" | "staff";
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
  subject: string;
  status: TicketStatus;
  customerEmail: string;
  customerName: string | null;
  origin: TicketOrigin;
  awaitingStaff: boolean;
  lastMessagePreview: TicketLastMessagePreview | null;
  messagesCount: number;
  createdAt: string;
  updatedAt: string;
  doneAt: string | null;
}

export interface RelatedTicketDTO {
  id: string;
  subject: string;
  status: TicketStatus;
  awaitingStaff: boolean;
  updatedAt: string;
}

export interface TicketDetailDTO extends TicketListItemDTO {
  userId: string | null;
  messages: TicketMessageDTO[];
  /**
   * Outras threads do mesmo `customerEmail` (até 5, mais recentes
   * primeiro). Usado pelo painel lateral.
   */
  relatedTickets: RelatedTicketDTO[];
}

export interface CountsByStatus {
  new: number;
  in_progress: number;
  done: number;
  read: number;
}

export interface CountsByBox {
  inbox: CountsByStatus;
  outbox: CountsByStatus;
}

export interface TicketsListResponse {
  items: TicketListItemDTO[];
  counts: CountsByBox;
}

export interface FetchTicketsOptions {
  status?: TicketStatus;
  box?: TicketBox;
}

export async function fetchTickets(
  opts: FetchTicketsOptions = {},
): Promise<TicketsListResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.box) params.set("box", opts.box);
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
