import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchExam, fetchSubmissionsByExam } from "@/features/app/provas/data";
import { fetchTurma } from "@/features/app/turmas/data";
import { ExamDetail } from "@/features/app/provas/exam-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const exam = await fetchExam(id);
    return { title: exam.title };
  } catch {
    return { title: "Prova" };
  }
}

export default async function ExamDetailPage({ params }: PageProps) {
  const { id } = await params;

  let exam;
  try {
    exam = await fetchExam(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [turmaName, submissions] = await Promise.all([
    fetchTurma(exam.classId)
      .then((t) => t.name)
      .catch(() => "Turma"),
    fetchSubmissionsByExam(id).catch(() => ({
      items: [],
      stats: {
        total: 0,
        average: 0,
        highest: null,
        lowest: null,
        passRate: null,
        inProgress: 0,
      },
    })),
  ]);

  return (
    <ExamDetail exam={exam} turmaName={turmaName} submissions={submissions} />
  );
}
