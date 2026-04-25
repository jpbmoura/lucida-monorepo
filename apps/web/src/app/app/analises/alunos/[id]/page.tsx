import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchStudentOverview } from "@/features/app/analises/data";
import { StudentAnalyticsPage } from "@/features/app/analises/student/student-analytics-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await fetchStudentOverview(id);
    return { title: `${data.student.name} · Análises` };
  } catch {
    return { title: "Análises do aluno" };
  }
}

export default async function StudentAnalyticsRoute({ params }: PageProps) {
  const { id } = await params;

  let overview;
  try {
    overview = await fetchStudentOverview(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <StudentAnalyticsPage overview={overview} />;
}
