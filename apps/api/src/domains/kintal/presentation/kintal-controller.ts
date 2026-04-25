import type { RequestHandler } from "express";
import type { GetDashboardMetricsUseCase } from "../application/get-dashboard-metrics.js";
import { dashboardQuery } from "./kintal-schemas.js";

interface Deps {
  getDashboardMetrics: GetDashboardMetricsUseCase;
}

export class KintalController {
  constructor(private readonly deps: Deps) {}

  getDashboard: RequestHandler = async (req, res, next) => {
    try {
      const { period } = dashboardQuery.parse(req.query);
      const metrics = await this.deps.getDashboardMetrics.execute({ period });
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  };
}
