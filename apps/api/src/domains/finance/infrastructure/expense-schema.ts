import mongoose, { Schema, type Model } from "mongoose";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "../domain/expense-category.js";

export interface ExpenseDoc {
  _id: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  occurredAt: Date;
  createdByUserId: string;
  source: string;
  externalRef: string | null;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDoc>(
  {
    _id: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [...EXPENSE_CATEGORIES],
    },
    description: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 1 },
    occurredAt: { type: Date, required: true, index: true },
    createdByUserId: { type: String, required: true },
    source: { type: String, required: true, default: "manual" },
    externalRef: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "finance_expenses",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Range queries por período + ordenação.
expenseSchema.index({ occurredAt: -1 });
// Agg por categoria dentro de range.
expenseSchema.index({ category: 1, occurredAt: 1 });

export const ExpenseModel: Model<ExpenseDoc> =
  (mongoose.models.Expense as Model<ExpenseDoc> | undefined) ??
  mongoose.model<ExpenseDoc>("Expense", expenseSchema);
