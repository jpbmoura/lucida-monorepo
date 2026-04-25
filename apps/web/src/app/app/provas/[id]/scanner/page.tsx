import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import {
  fetchExam,
  fetchScansByExam,
  type ScanItemDTO,
} from "@/features/app/provas/data";
import { fetchTurma } from "@/features/app/turmas/data";
import { ExamScanner } from "@/features/app/provas/scanner/exam-scanner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const exam = await fetchExam(id);
    return { title: `${exam.title} · Scanner` };
  } catch {
    return { title: "Scanner" };
  }
}

export default async function ExamScannerPage({ params }: PageProps) {
  const { id } = await params;

  let exam;
  try {
    exam = await fetchExam(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [turmaName, initialScans] = await Promise.all([
    fetchTurma(exam.classId)
      .then((t) => t.name)
      .catch(() => "Turma"),
    fetchScansByExam(id).catch(() => [] as ScanItemDTO[]),
  ]);

  return (
    <ExamScanner
      exam={exam}
      turmaName={turmaName}
      initialScans={initialScans}
    />
  );
}
