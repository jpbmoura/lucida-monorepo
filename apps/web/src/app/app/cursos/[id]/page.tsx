import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CursoDetail } from "@/features/app/cursos/curso-detail";
import { fetchCurso } from "@/features/app/cursos/data";
import { ApiError } from "@/lib/api-client";

interface CursoPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CursoPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const curso = await fetchCurso(id);
    return { title: curso.name };
  } catch {
    return { title: "Curso" };
  }
}

export default async function CursoPage({ params }: CursoPageProps) {
  const { id } = await params;
  try {
    const curso = await fetchCurso(id);
    return (
      <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
        <CursoDetail curso={curso} />
      </div>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
