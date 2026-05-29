import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchLessonPlan } from "@/features/app/aulas/data";
import { PrintLessonPlan } from "@/features/app/aulas/print/print-lesson-plan";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const plan = await fetchLessonPlan(id);
    return { title: `${plan.identification.title} · Imprimir` };
  } catch {
    return { title: "Imprimir plano" };
  }
}

export default async function PrintLessonPlanPage({ params }: PageProps) {
  const { id } = await params;
  let plan;
  try {
    plan = await fetchLessonPlan(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <PrintLessonPlan plan={plan} />;
}
