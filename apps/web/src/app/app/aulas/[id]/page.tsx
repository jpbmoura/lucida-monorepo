import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchLessonPlan } from "@/features/app/aulas/data";
import { PlanDetail } from "@/features/app/aulas/plan-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const plan = await fetchLessonPlan(id);
    return { title: plan.identification.title };
  } catch {
    return { title: "Plano de aula" };
  }
}

export default async function AulaDetailPage({ params }: PageProps) {
  const { id } = await params;
  let plan;
  try {
    plan = await fetchLessonPlan(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <PlanDetail plan={plan} />;
}
