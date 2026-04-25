import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { KintalDashboardMetrics, PeriodScope } from "./types";

export async function fetchDashboardMetrics(
  period: PeriodScope,
): Promise<KintalDashboardMetrics> {
  return apiFetch<KintalDashboardMetrics>(
    `/api/kintal/dashboard?period=${period}`,
  );
}
