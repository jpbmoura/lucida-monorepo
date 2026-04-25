import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchExam } from "@/features/app/provas/data";
import { PrintExam } from "@/features/app/provas/print/print-exam";
import type { ExamExportVersion } from "@/features/app/provas/print/print-exam";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const exam = await fetchExam(id);
    return { title: `${exam.title} · Imprimir` };
  } catch {
    return { title: "Imprimir prova" };
  }
}

export default async function PrintExamPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const version = parseVersion(sp.version);

  let exam;
  try {
    exam = await fetchExam(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <PrintExam exam={exam} version={version} />;
}

function parseVersion(raw: string | undefined): ExamExportVersion {
  if (raw === "answer_key" || raw === "both") return raw;
  return "student";
}
