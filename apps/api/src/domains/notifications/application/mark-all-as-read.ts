import type { NotificationRepository } from "../domain/notification-repository.js";

export class MarkAllAsReadUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  execute(recipientUserId: string): Promise<number> {
    return this.repo.markAllAsReadForRecipient(recipientUserId);
  }
}
