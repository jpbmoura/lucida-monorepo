import type { Ticket } from "../domain/ticket.js";

/**
 * Port pra notificar staff sobre eventos do ticketing. Hoje usado
 * apenas em "novo ticket" (criação por inbound email ou form). Quando
 * adicionar mais eventos (cliente respondeu, ticket parado, etc),
 * estende esse port.
 */
export interface TicketNotifier {
  notifyNewTicket(ticket: Ticket): Promise<void>;
}
