import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchSubmissionForGrading } from "@/features/app/provas/data";
import { ManualGrading } from "@/features/app/provas/grading/manual-grading";

export const metadata: Metadata = { title: "Corrigir discursivas" };

interface PageProps {
  params: Promise<{ id: string; submissionId: string }>;
}

export default async function GradingPage({ params }: PageProps) {
  const { id, submissionId } = await params;

  let data;
  try {
    data = await fetchSubmissionForGrading(id, submissionId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <ManualGrading examId={id} data={data} />;
}
