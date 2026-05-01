import "server-only";
import { apiFetch } from "@/lib/api-client";

export type TicketStatus = "new" | "in_progress" | "done";
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

export interface TicketDetailDTO extends TicketListItemDTO {
  userId: string | null;
  messages: TicketMessageDTO[];
}

export interface TicketsListResponse {
  items: TicketListItemDTO[];
  counts: {
    new: number;
    in_progress: number;
    done: number;
  };
}

export interface FetchTicketsOptions {
  status?: TicketStatus;
}

export async function fetchTickets(
  opts: FetchTicketsOptions = {},
): Promise<TicketsListResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
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
