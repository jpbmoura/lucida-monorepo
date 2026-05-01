import { ObjectId, type Db } from "mongodb";
import { env } from "@/env.js";
import { Notification } from "@/domains/notifications/domain/notification.js";
import type { NotificationRepository } from "@/domains/notifications/domain/notification-repository.js";
import type { Ticket } from "../domain/ticket.js";
import type { TicketNotifier } from "../application/ticket-notifier.js";

/**
 * Cria notification in-app pra cada staff quando um ticket novo aparece.
 * Bypassa o `SendNotificationUseCase` porque não temos audience type
 * "staff" no resolver — em vez de poluir o resolver de notifications
 * (que serve broadcasts genéricos), montamos a lista localmente.
 *
 * Best-effort: se Mongo der ruim, log + segue. Caller (HandleInboundEmail)
 * já trata erros de notification como não-fatais.
 *
 * Notifications criadas:
 *  - title: "Novo email de {cliente}"
 *  - body: snippet do email do cliente
 *  - link: `/kintal/emails/{id}` — cliente Kintal abre direto
 *  - severity: "info"
 *  - senderRole: "system"
 */
export class NotificationsTicketNotifier implements TicketNotifier {
  constructor(
    private readonly authDb: Db,
    private readonly notifications: NotificationRepository,
  ) {}

  async notifyNewTicket(ticket: Ticket): Promise<void> {
    try {
      const staffIds = await this.findStaffUserIds();
      if (staffIds.length === 0) return;

      const last = ticket.lastMessage();
      const snippet = last?.bodyText.slice(0, 200) ?? "";
      const customerLabel =
        ticket.customerName ?? ticket.customerEmail;
      const title = `Novo email de ${customerLabel}`;
      const body = ticket.subject
        ? `${ticket.subject}\n\n${snippet}`
        : snippet;
      const link = `${env.WEB_ORIGIN}/kintal/emails/${ticket.id.toString()}`;
      const now = new Date();

      const docs = staffIds.map((userId) =>
        Notification.create({
          id: this.notifications.nextId(),
          recipientUserId: userId,
          title,
          body,
          severity: "info",
          link,
          senderRole: "system",
          // senderUserId é informativo — usamos o próprio user que vai
          // receber, já que não há "system user" físico. Nada lê isso
          // de volta de forma crítica.
          senderUserId: userId,
          senderOrgId: null,
          campaignId: `ticket:${ticket.id.toString()}`,
          audienceLabel: "Staff (sistema)",
          now,
        }),
      );
      await this.notifications.bulkInsert(docs);
    } catch (err) {
      console.error("[tickets] notifier falhou (skip):", err);
    }
  }

  private async findStaffUserIds(): Promise<string[]> {
    const docs = await this.authDb
      .collection<{ _id: ObjectId; role?: string }>("user")
      .find({ role: "staff" })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    return docs.map((d) => String(d._id));
  }
}
