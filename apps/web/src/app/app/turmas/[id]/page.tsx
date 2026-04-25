import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import {
  fetchTurma,
  fetchAlunosByTurma,
  fetchExamsByTurma,
} from "@/features/app/turmas/data";
import { TurmaDetail } from "@/features/app/turmas/detail/turma-detail";

interface TurmaPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TurmaPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const turma = await fetchTurma(id);
    return { title: turma.name };
  } catch {
    return { title: "Turma" };
  }
}

export default async function TurmaDetailPage({ params }: TurmaPageProps) {
  const { id } = await params;

  let turma;
  try {
    turma = await fetchTurma(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [exams, alunos] = await Promise.all([
    fetchExamsByTurma(id),
    fetchAlunosByTurma(id),
  ]);

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <TurmaDetail initialTurma={turma} exams={exams} alunos={alunos} />
    </div>
  );
}
