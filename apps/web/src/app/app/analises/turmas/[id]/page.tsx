import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import {
  fetchClassOverview,
  type OverviewPeriod,
} from "@/features/app/analises/data";
import { ClassAnalyticsPage } from "@/features/app/analises/class/class-analytics-page";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await fetchClassOverview(id, "30d");
    return { title: `${data.class.name} · Análises` };
  } catch {
    return { title: "Análises da turma" };
  }
}

export default async function ClassAnalyticsRoute({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  let overview;
  try {
    overview = await fetchClassOverview(id, period);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <ClassAnalyticsPage overview={overview} period={period} />;
}

function parsePeriod(raw: string | undefined): OverviewPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") {
    return raw;
  }
  return "30d";
}
