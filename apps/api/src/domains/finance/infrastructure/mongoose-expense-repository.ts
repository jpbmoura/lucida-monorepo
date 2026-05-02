import { randomUUID } from "node:crypto";
import type {
  ExpenseRepository,
  ExpensesByCategoryAggregate,
  ExpensesMonthlyAggregate,
} from "../domain/expense-repository.js";
import { ExpenseId } from "../domain/expense-id.js";
import { Expense } from "../domain/expense.js";
import {
  isExpenseCategory,
  type ExpenseCategory,
} from "../domain/expense-category.js";
import { ExpenseModel, type ExpenseDoc } from "./expense-schema.js";

export class MongooseExpenseRepository implements ExpenseRepository {
  nextId(): ExpenseId {
    return ExpenseId.of(randomUUID());
  }

  async save(expense: Expense): Promise<void> {
    await ExpenseModel.updateOne(
      { _id: expense.id.toString() },
      {
        $set: {
          category: expense.category,
          description: expense.description,
          amountCents: expense.amountCents,
          occurredAt: expense.occurredAt,
          createdByUserId: expense.createdByUserId,
          source: expense.source,
          externalRef: expense.externalRef,
          metadata: expense.metadata,
        },
        $setOnInsert: { _id: expense.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: ExpenseId): Promise<Expense | null> {
    const doc = await ExpenseModel.findById(id.toString())
      .lean<ExpenseDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: ExpenseId): Promise<void> {
    await ExpenseModel.deleteOne({ _id: id.toString() });
  }

  async listInRange(range: { from: Date; to: Date }): Promise<Expense[]> {
    const docs = await ExpenseModel.find({
      occurredAt: { $gte: range.from, $lt: range.to },
    })
      .sort({ occurredAt: -1 })
      .lean<ExpenseDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async aggregateByCategory(range: {
    from: Date;
    to: Date;
  }): Promise<ExpensesByCategoryAggregate[]> {
    const rows = await ExpenseModel.aggregate<{
      _id: string;
      totalCents: number;
      count: number;
    }>([
      { $match: { occurredAt: { $gte: range.from, $lt: range.to } } },
      {
        $group: {
          _id: "$category",
          totalCents: { $sum: "$amountCents" },
          count: { $sum: 1 },
        },
      },
    ]);
    const out: ExpensesByCategoryAggregate[] = [];
    for (const r of rows) {
      if (!isExpenseCategory(r._id)) continue;
      out.push({
        category: r._id satisfies ExpenseCategory,
        totalCents: r.totalCents,
        count: r.count,
      });
    }
    return out;
  }

  async aggregateMonthly(range: {
    from: Date;
    to: Date;
  }): Promise<ExpensesMonthlyAggregate[]> {
    const rows = await ExpenseModel.aggregate<{
      _id: number;
      totalCents: number;
    }>([
      { $match: { occurredAt: { $gte: range.from, $lt: range.to } } },
      {
        $group: {
          _id: { $month: { date: "$occurredAt", timezone: "UTC" } },
          totalCents: { $sum: "$amountCents" },
        },
      },
    ]);
    return rows.map((r) => ({ month: r._id, totalCents: r.totalCents }));
  }
}

function toEntity(doc: ExpenseDoc): Expense {
  return Expense.restore({
    id: ExpenseId.of(doc._id),
    category: doc.category,
    description: doc.description,
    amountCents: doc.amountCents,
    occurredAt: doc.occurredAt,
    createdByUserId: doc.createdByUserId,
    source: doc.source,
    externalRef: doc.externalRef,
    metadata: doc.metadata ?? {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
