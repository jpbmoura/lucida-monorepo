import type { RequestHandler } from "express";
import type { ListInboxUseCase } from "../application/list-inbox.js";
import type { CountUnreadUseCase } from "../application/count-unread.js";
import type { MarkAsReadUseCase } from "../application/mark-as-read.js";
import type { MarkAllAsReadUseCase } from "../application/mark-all-as-read.js";
import type { DismissNotificationUseCase } from "../application/dismiss-notification.js";
import {
  inboxQuery,
  notificationIdParams,
} from "./notification-schemas.js";

interface Deps {
  listInbox: ListInboxUseCase;
  countUnread: CountUnreadUseCase;
  markAsRead: MarkAsReadUseCase;
  markAllAsRead: MarkAllAsReadUseCase;
  dismiss: DismissNotificationUseCase;
}

/** Endpoints que QUALQUER user autenticado usa pra a sua própria caixa. */
export class NotificationReceiverController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const filter = inboxQuery.parse(req.query);
      const items = await this.deps.listInbox.execute({
        recipientUserId: req.auth!.userId,
        filter,
      });
      res.json({ data: { notifications: items } });
    } catch (err) {
      next(err);
    }
  };

  unreadCount: RequestHandler = async (req, res, next) => {
    try {
      const count = await this.deps.countUnread.execute(req.auth!.userId);
      res.json({ data: { count } });
    } catch (err) {
      next(err);
    }
  };

  markAsRead: RequestHandler = async (req, res, next) => {
    try {
      const { notificationId } = notificationIdParams.parse(req.params);
      await this.deps.markAsRead.execute({
        notificationId,
        recipientUserId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead: RequestHandler = async (req, res, next) => {
    try {
      const updated = await this.deps.markAllAsRead.execute(req.auth!.userId);
      res.json({ data: { updated } });
    } catch (err) {
      next(err);
    }
  };

  dismiss: RequestHandler = async (req, res, next) => {
    try {
      const { notificationId } = notificationIdParams.parse(req.params);
      await this.deps.dismiss.execute({
        notificationId,
        recipientUserId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
