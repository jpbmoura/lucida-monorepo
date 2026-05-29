import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchTurma } from "@/features/app/turmas/data";
import { AulaWizard } from "@/features/app/aulas/wizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Novo plano de aula",
};

export default async function NovaAulaPage({ params }: PageProps) {
  const { id } = await params;
  let turma;
  try {
    turma = await fetchTurma(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <AulaWizard classId={turma.id} turmaName={turma.name} />;
}
