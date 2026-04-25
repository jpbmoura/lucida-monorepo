import type { Metadata } from "next";
import { TurmaList } from "@/features/app/turmas/turma-list";
import { fetchTurmas } from "@/features/app/turmas/data";

export const metadata: Metadata = {
  title: "Turmas",
};

export default async function TurmasPage() {
  const turmas = await fetchTurmas();

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <TurmaList initialTurmas={turmas} />
    </div>
  );
}
