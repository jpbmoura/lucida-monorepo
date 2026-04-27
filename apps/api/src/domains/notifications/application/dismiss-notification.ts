import type { NotificationRepository } from "../domain/notification-repository.js";
import { NotificationId } from "../domain/notification-id.js";
import { NotificationNotFoundError } from "../domain/notifications-errors.js";

export interface DismissInput {
  notificationId: string;
  recipientUserId: string;
}

/**
 * Dispensa = soft hide. Receipt continua no banco (sender ainda vê na
 * campanha), mas some do inbox do receiver. Usado pra limpar caixa.
 */
export class DismissNotificationUseCase {
  constructor(private readonly repo: NotificationRepository) {}

  async execute(input: DismissInput): Promise<void> {
    const n = await this.repo.findById(NotificationId.of(input.notificationId));
    if (!n || n.recipientUserId !== input.recipientUserId) {
      throw new NotificationNotFoundError();
    }
    n.dismiss();
    await this.repo.save(n);
  }
}
