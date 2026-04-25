import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchTurma } from "@/features/app/turmas/data";
import { Wizard } from "@/features/app/provas/wizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Nova prova",
};

export default async function NovaProvaPage({ params }: PageProps) {
  const { id } = await params;
  let turma;
  try {
    turma = await fetchTurma(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <Wizard classId={turma.id} turmaName={turma.name} />;
}
