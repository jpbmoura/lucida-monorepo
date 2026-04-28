import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { fetchAssistantTeachers } from "@/features/auth/assistant/data";
import Link from "next/link";
import {
  PickerLogoutButton,
  TeacherPicker,
} from "@/features/auth/assistant/teacher-picker";

export const metadata: Metadata = {
  title: "Escolher professor",
};

export default async function AssistantPickerPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in?next=/auxiliar/escolher");
  }

  const teachers = await fetchAssistantTeachers();

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link
          href="/sign-in"
          className="text-base font-medium tracking-tight text-ink"
        >
          Lucida
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 md:inline">
            {session.user.email}
          </span>
          <PickerLogoutButton />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-12">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Auxiliar
          </div>
          <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            Escolha o professor que{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              você vai atender
            </span>
          </h1>
          <p className="mt-3 text-[15px] text-gray-500">
            Você está logado como auxiliar. Tudo que fizer dentro do app vai
            ser registrado em nome do professor escolhido — incluindo provas,
            turmas e consumo de créditos.
          </p>
        </div>

        <TeacherPicker teachers={teachers} />
      </section>
    </main>
  );
}
