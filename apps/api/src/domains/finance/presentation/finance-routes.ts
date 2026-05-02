import { Router, type RequestHandler } from "express";
import type { FinanceController } from "./finance-controller.js";

interface MakeFinanceRouterDeps {
  requireAuth: RequestHandler;
  requireStaff: RequestHandler;
  controller: FinanceController;
}

/**
 * Rotas do dashboard financeiro do Kintal — todas staff-only. Convivem
 * com `/api/kintal/*` mas ficam em `/api/kintal/finance/*` pra agrupar
 * o feature.
 */
export function makeFinanceRouter({
  requireAuth,
  requireStaff,
  controller,
}: MakeFinanceRouterDeps): Router {
  const router = Router();

  router.get(
    "/api/kintal/finance/summary",
    requireAuth,
    requireStaff,
    controller.getSummary,
  );

  router.get(
    "/api/kintal/finance/expenses",
    requireAuth,
    requireStaff,
    controller.listExpenses,
  );
  router.post(
    "/api/kintal/finance/expenses",
    requireAuth,
    requireStaff,
    controller.createExpense,
  );
  router.delete(
    "/api/kintal/finance/expenses/:expenseId",
    requireAuth,
    requireStaff,
    controller.deleteExpense,
  );

  return router;
}
