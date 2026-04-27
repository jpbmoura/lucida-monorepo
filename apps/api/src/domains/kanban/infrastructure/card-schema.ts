import mongoose, { Schema, type Model } from "mongoose";
import { CARD_STATUSES, type CardStatus } from "../domain/card-status.js";
import {
  CARD_PRIORITIES,
  type CardPriority,
} from "../domain/card-priority.js";

export interface CardDoc {
  _id: string;
  title: string;
  description: string;
  status: CardStatus;
  priority: CardPriority;
  assigneeId: string | null;
  tags: string[];
  createdById: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<CardDoc>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      required: true,
      enum: [...CARD_STATUSES],
      default: "backlog",
    },
    priority: {
      type: String,
      required: true,
      enum: [...CARD_PRIORITIES],
      default: "medium",
    },
    assigneeId: { type: String, default: null, index: true },
    tags: { type: [String], default: [] },
    createdById: { type: String, required: true, index: true },
    completedAt: { type: Date, default: null },
  },
  {
    collection: "kanban_cards",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

cardSchema.index({ status: 1, updatedAt: -1 });

export const CardModel: Model<CardDoc> =
  (mongoose.models.KanbanCard as Model<CardDoc> | undefined) ??
  mongoose.model<CardDoc>("KanbanCard", cardSchema);
