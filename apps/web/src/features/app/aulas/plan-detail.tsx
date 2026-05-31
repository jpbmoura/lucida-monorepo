"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileDown,
  Loader2,
  Pencil,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanBlocks } from "./components/plan-blocks";
import { PlanView } from "./components/plan-view";
import { HandoffButtons } from "./components/handoff-buttons";
import { BetaNotice } from "./components/beta-notice";
import { regenerateBlock } from "./regenerate-block";
import { updateLessonPlanAction } from "./actions";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";
import {
  SEGMENT_META,
  type AulaConfig,
  type LessonPlanBlockKey,
  type LessonPlanContent,
  type LessonPlanDTO,
} from "./types";

interface PlanDetailProps {
  plan: LessonPlanDTO;
}

type SaveState = "idle" | "saving" | "saved";
type Mode = "view" | "edit";

const AUTOSAVE_MS = 1200;

export function PlanDetail({ plan }: PlanDetailProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [title, setTitle] = useState(plan.identification.title);
  const [content, setContent] = useState<LessonPlanContent>(plan.content);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);

  const config: AulaConfig = {
    segment: plan.segment,
    title,
    subject: plan.identification.subject,
    level: plan.identification.level,
    durationMinutes: plan.identification.durationMinutes,
    language: "pt-BR",
  };

  const save = useCallback(async () => {
    setSaveState("saving");
    const result = await updateLessonPlanAction(plan.id, plan.classId, {
      identification: { title },
      content,
    });
    if (result.ok) {
      setSaveState("saved");
      setError(null);
    } else {
      setSaveState("idle");
      setError(result.error?.message ?? "Falha ao salvar.");
    }
  }, [plan.id, plan.classId, title, content]);

  // Auto-save debounced (só no modo edição). Pula enquanto nada está sujo.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [title, content, save]);

  function onChangeBlock(key: LessonPlanBlockKey, value: string | string[]) {
    dirty.current = true;
    setSaveState("idle");
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function handleRegenerate(key: LessonPlanBlockKey) {
    setError(null);
    try {
      const result = await regenerateBlock({ config, currentPlan: content, blockKey: key });
      const value = result.block[key];
      if (value !== undefined) {
        dirty.current = true;
        setSaveState("idle");
        setContent((c) => ({ ...c, [key]: value as string | string[] }));
      }
      notifyBalanceChanged();
    } catch (err) {
      setError((err as Error).message ?? "Erro ao regerar o bloco.");
    }
  }

  // Ao sair da edição, garante um save final se houver mudança pendente.
  async function finishEditing() {
    if (dirty.current) await save();
    setMode("view");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 pb-20 md:px-10 md:py-10">
      <Link
        href={`/app/turmas/${plan.classId}?tab=aulas`}
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Voltar pra turma
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 font-medium text-brand-primary">
            {SEGMENT_META[plan.segment].label}
          </span>
          {mode === "edit" && <SaveIndicator state={saveState} />}
        </div>

        {mode === "edit" ? (
          <Input
            value={title}
            onChange={(e) => {
              dirty.current = true;
              setSaveState("idle");
              setTitle(e.target.value);
            }}
            className="h-auto! border-0 px-0 text-2xl! font-medium tracking-tight text-ink shadow-none focus-visible:ring-0"
          />
        ) : (
          <h1 className="text-2xl font-medium tracking-tight text-ink md:text-3xl">
            {title}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {mode === "view" ? (
            <Button variant="primary" size="sm" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Editar plano
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={finishEditing}>
              <Check className="size-4" />
              Concluir edição
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/print/lesson-plans/${plan.id}`} target="_blank">
              <Printer className="size-4" />
              Imprimir / PDF
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/v1/lesson-plans/${plan.id}/export.docx`}>
              <FileDown className="size-4" />
              Baixar Word
            </a>
          </Button>
        </div>
      </header>

      <BetaNotice className="mt-6" />

      {/* Handoff — diferencial: o plano vira prova num clique. */}
      <div className="mt-6 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-5">
        <h2 className="text-sm font-semibold text-ink">Próximo passo</h2>
        <p className="mt-1 text-[13px] text-gray-600">
          Transforme este plano em avaliação ou material, sem recomeçar do zero.
        </p>
        <HandoffButtons
          classId={plan.classId}
          planId={plan.id}
          planTitle={plan.identification.title}
          planSubject={plan.identification.subject}
          planLevel={plan.identification.level}
          className="mt-4"
        />
        {plan.generatedExamId && (
          <p className="mt-3 text-xs text-emerald-700">
            ✓ Já existe uma prova gerada a partir deste plano.
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        {mode === "edit" ? (
          <PlanBlocks
            segment={plan.segment}
            content={content}
            onChange={onChangeBlock}
            onRegenerate={handleRegenerate}
          />
        ) : (
          <PlanView segment={plan.segment} content={content} />
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-gray-400">
        <Loader2 className="size-3 animate-spin" />
        salvando…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <Check className="size-3" />
        salvo
      </span>
    );
  }
  return null;
}
