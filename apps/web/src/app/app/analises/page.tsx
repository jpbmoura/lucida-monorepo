import type { Metadata } from "next";
import { fetchOverview, type OverviewPeriod } from "@/features/app/analises/data";
import { AnalisesPage } from "@/features/app/analises/analises-page";

export const metadata: Metadata = {
  title: "Análises",
};

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function AnalisesRoute({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const overview = await fetchOverview(period);

  return <AnalisesPage overview={overview} period={period} />;
}

function parsePeriod(raw: string | undefined): OverviewPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") {
    return raw;
  }
  return "30d";
}
