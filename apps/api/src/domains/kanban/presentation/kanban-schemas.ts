import { z } from "zod";
import { CARD_STATUSES } from "../domain/card-status.js";
import { CARD_PRIORITIES } from "../domain/card-priority.js";

const statusEnum = z.enum(CARD_STATUSES);
const priorityEnum = z.enum(CARD_PRIORITIES);

export const listCardsQuery = z.object({
  assigneeId: z.string().optional(),
  priority: priorityEnum.optional(),
  tagId: z.string().optional(),
});

export const createCardBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5_000).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const updateCardBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5_000).optional(),
  priority: priorityEnum.optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const moveCardBody = z.object({
  status: statusEnum,
});

export const cardIdParams = z.object({
  cardId: z.string().min(1),
});
