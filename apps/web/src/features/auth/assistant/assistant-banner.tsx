"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat, ShieldCheck } from "lucide-react";

interface Props {
  teacherName: string | null;
  teacherEmail: string;
  assistantName: string | null;
  assistantEmail: string;
  canSwitch: boolean;
}

/**
 * Banner persistente no topo do /app quando a sessão é de um auxiliar.
 * Reforça o contexto ("Você [auxiliar] está acessando a conta de
 * [professor]") e deixa explícito que a auditoria registra o auxiliar,
 * não o professor.
 */
export function AssistantBanner({
  teacherName,
  teacherEmail,
  assistantName,
  assistantEmail,
  canSwitch,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchTeacher() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/v1/iam/assistant/clear", { method: "POST" });
      if (!res.ok) {
        setError("Não foi possível trocar.");
        return;
      }
      router.replace("/auxiliar/escolher");
    });
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 md:px-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-900">
          <ShieldCheck className="size-4" />
          <span>
            Você (
            <strong className="font-semibold">
              {assistantName ?? assistantEmail}
            </strong>
            ) está acessando a conta de{" "}
            <strong className="font-semibold">
              {teacherName ?? teacherEmail}
            </strong>
            . Suas alterações ficam registradas em seu nome.
          </span>
        </div>
        {canSwitch && (
          <button
            type="button"
            onClick={switchTeacher}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-pill border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            <Repeat className="size-3" />
            {isPending ? "Trocando..." : "Trocar professor"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[12px] text-red-700">{error}</p>
      )}
    </div>
  );
}
