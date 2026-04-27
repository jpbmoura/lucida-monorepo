import type { NotificationRepository } from "../domain/notification-repository.js";

export class CountUnreadUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  execute(recipientUserId: string): Promise<number> {
    return this.repo.countUnreadForRecipient(recipientUserId);
  }
}
