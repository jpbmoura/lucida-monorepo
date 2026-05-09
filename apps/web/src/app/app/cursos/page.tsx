import type { Metadata } from "next";
import { CursosList } from "@/features/app/cursos/cursos-list";
import { fetchCursos } from "@/features/app/cursos/data";

export const metadata: Metadata = {
  title: "Cursos",
};

export default async function CursosPage() {
  const cursos = await fetchCursos();

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <CursosList initialCursos={cursos} />
    </div>
  );
}
