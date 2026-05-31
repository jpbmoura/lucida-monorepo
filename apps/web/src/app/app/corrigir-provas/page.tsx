import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { fetchGradingQueue } from "@/features/app/provas/data";
import { GradingQueue } from "@/features/app/provas/grading/grading-queue";

export const metadata: Metadata = {
  title: "Corrigir Provas",
};

export default async function CorrigirProvasPage() {
  const effective = await getEffectiveUser();
  if (!effective) redirect("/sign-in?next=/app/corrigir-provas");

  const queue = await fetchGradingQueue();
  const hasItems = queue.totalSubmissions > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 pb-20 md:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink">
          Corrigir Provas
        </h1>
        <p className="text-sm text-gray-500">
          {hasItems ? (
            <>
              <strong className="tabular-nums text-ink">
                {queue.totalSubmissions}
              </strong>{" "}
              {queue.totalSubmissions === 1
                ? "submissão aguardando"
                : "submissões aguardando"}{" "}
              correção em{" "}
              <strong className="tabular-nums text-ink">{queue.totalExams}</strong>{" "}
              {queue.totalExams === 1 ? "prova" : "provas"}.
            </>
          ) : (
            "Acompanhe aqui as discursivas que ainda precisam da sua correção."
          )}
        </p>
      </header>

      <div className="mt-8">
        {hasItems ? (
          <GradingQueue data={queue} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <ClipboardCheck className="size-6" />
            </span>
            <p className="text-base font-medium text-ink">
              Nenhuma prova aguardando correção 🎉
            </p>
            <p className="max-w-sm text-sm text-gray-500">
              Quando seus alunos enviarem provas com questões discursivas, elas
              aparecem aqui agrupadas por curso, turma e prova.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
