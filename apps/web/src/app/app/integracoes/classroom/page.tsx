import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { fetchClassroomStatus, fetchClassroomCourses } from "@/features/app/integracoes/data";
import { fetchCursos } from "@/features/app/cursos/data";
import { ClassroomPanel } from "@/features/app/integracoes/classroom/classroom-panel";

export const metadata: Metadata = {
  title: "Google Classroom",
};

export default async function ClassroomPanelRoute() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in?next=/app/integracoes/classroom");

  const status = await fetchClassroomStatus();
  // Sem conexão não há painel — volta pra grade de integrações pra conectar.
  if (!status.connected) redirect("/app/integracoes");

  // Cursos da Lucida pro seletor do dialog de import (escolher existente).
  // Se a chamada ao Google falhar (token revogado, etc.), volta pra grade com
  // erro em vez de estourar a página — degradação graciosa.
  let courses: Awaited<ReturnType<typeof fetchClassroomCourses>>;
  let cursos: Awaited<ReturnType<typeof fetchCursos>>;
  try {
    [courses, cursos] = await Promise.all([
      fetchClassroomCourses(),
      fetchCursos(),
    ]);
  } catch {
    redirect("/app/integracoes?classroom=error");
  }

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <ClassroomPanel
        googleEmail={status.googleEmail}
        initialCourses={courses}
        lucidaCourses={cursos.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
