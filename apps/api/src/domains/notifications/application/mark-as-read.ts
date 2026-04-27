import type { NotificationRepository } from "../domain/notification-repository.js";
import { NotificationId } from "../domain/notification-id.js";
import { NotificationNotFoundError } from "../domain/notifications-errors.js";

export interface MarkAsReadInput {
  notificationId: string;
  recipientUserId: string;
}

export class MarkAsReadUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: MarkAsReadInput): Promise<void> {
    const n = await this.repo.findById(NotificationId.of(input.notificationId));
    if (!n || n.recipientUserId !== input.recipientUserId) {
      // Mesmo erro pra "não existe" e "existe mas não é seu" — não vaza
      // info de outros usuários.
      throw new NotificationNotFoundError();
    }
    n.markAsRead();
    await this.repo.save(n);
  }
}
