import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchExamOverview } from "@/features/app/analises/data";
import { ExamAnalyticsPage } from "@/features/app/analises/exam/exam-analytics-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await fetchExamOverview(id);
    return { title: `${data.exam.title} · Análises` };
  } catch {
    return { title: "Análises da prova" };
  }
}

export default async function ExamAnalyticsRoute({ params }: PageProps) {
  const { id } = await params;

  let overview;
  try {
    overview = await fetchExamOverview(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <ExamAnalyticsPage overview={overview} />;
}
