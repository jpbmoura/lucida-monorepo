"use client";

import { useState } from "react";
import { ArrowRight, ShieldAlert, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  examTitle: string;
  examDescription: string;
  questionCount: number;
  duration: number;
  securityLevel: "off" | "strict";
  /** Nome do aluno resolvido pelo token. Mostrado em destaque pra que o
   * aluno saiba que está logado como ele mesmo (sem confiar no link). */
  studentName: string;
  onStart: () => Promise<void>;
}

/**
 * Tela inicial usada quando o aluno chega via link assinado (token de
 * matrícula). Não pede código — só confirma identidade e pede confirmação
 * pra começar. Substituí `CodeEntry` no fluxo de token.
 */
export function WelcomeScreen({
  examTitle,
  examDescription,
  questionCount,
  duration,
  securityLevel,
  studentName,
  onStart,
}: WelcomeScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      await onStart();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-12 md:px-0">
      <header className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Prova
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {examTitle}
        </h1>
        {examDescription && (
          <p className="text-[15px] text-gray-500">{examDescription}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5">
            {questionCount} {questionCount === 1 ? "questão" : "questões"}
          </span>
          {duration > 0 && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5">
                {duration} min
              </span>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <UserCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.12em] text-gray-400">
              Identificado como
            </div>
            <div className="truncate text-base font-medium text-ink">
              {studentName}
            </div>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-gray-500">
          Sua identidade já foi validada pelo link enviado pela instituição.
          Quando estiver pronto pra começar, é só clicar abaixo.
        </p>

        {securityLevel === "strict" && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">Modo estrito ativado</div>
              <div className="mt-0.5 text-amber-700">
                Troca de aba, cópia e atalhos ficam bloqueados. 3 violações
                finalizam a prova automaticamente.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={busy}
          onClick={handleStart}
        >
          {busy ? "Carregando..." : "Começar prova"}
          {!busy && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
