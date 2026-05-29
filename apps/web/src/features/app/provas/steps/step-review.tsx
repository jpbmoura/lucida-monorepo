"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionEditor } from "../components/question-editor";
import { StudentPreview } from "../components/student-preview";
import { useWizardStore } from "../wizard-store";
import { createExamAction } from "../actions";
import { linkExamToLessonPlanAction } from "@/features/app/aulas/actions";
import type { GeneratedQuestion } from "../types";

interface StepReviewProps {
  classId: string;
  onRegenerate: (avoidStatements: string[]) => Promise<GeneratedQuestion | null>;
  /** Handoff: id do plano de aula que originou esta prova (back-reference). */
  fromLessonPlanId?: string;
}

export function StepReview({
  classId,
  onRegenerate,
  fromLessonPlanId,
}: StepReviewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const config = useWizardStore((s) => s.config);
  const questions = useWizardStore((s) => s.questions);
  const usage = useWizardStore((s) => s.usage);
  const updateQuestion = useWizardStore((s) => s.updateQuestion);
  const replaceQuestion = useWizardStore((s) => s.replaceQuestion);
  const removeQuestion = useWizardStore((s) => s.removeQuestion);
  const addQuestion = useWizardStore((s) => s.addQuestion);
  const setStep = useWizardStore((s) => s.setStep);
  const reset = useWizardStore((s) => s.reset);

  async function handleRegenerateAt(index: number) {
    setRegenError(null);
    const others = questions
      .filter((_, i) => i !== index)
      .map((q) => q.statement)
      .filter((s) => s.trim().length > 0);
    try {
      const result = await onRegenerate(others);
      if (result) replaceQuestion(index, result);
    } catch (err) {
      setRegenError((err as Error).message ?? "Erro ao regerar a questão.");
    }
  }

  async function handleSave() {
    if (questions.length === 0) {
      setSaveError("Adicione ao menos uma questão antes de salvar.");
      return;
    }
    const hasEmpty = questions.some(
      (q) => q.statement.trim().length < 3 || q.options.some((o) => !o.trim()),
    );
    if (hasEmpty) {
      setSaveError(
        "Tem questão incompleta (enunciado curto ou alternativa vazia). Preencha antes de salvar.",
      );
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const result = await createExamAction({
        classId,
        title: config.title,
        description: config.description,
        style: config.style,
        duration: config.duration,
        securityLevel: config.securityLevel,
        questions: questions.map((q) => ({
          type: q.type,
          statement: q.statement,
          context: q.context,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
        })),
        usage,
      });
      if (!result.ok) {
        setSaveError(result.error?.message ?? "Não foi possível salvar a prova.");
        return;
      }
      // Handoff: grava a back-reference no plano de aula que originou a prova.
      // Best-effort — não bloqueia a navegação se falhar.
      if (fromLessonPlanId && result.data?.id) {
        void linkExamToLessonPlanAction(fromLessonPlanId, result.data.id);
      }
      reset();
      startTransition(() => {
        router.push(`/app/turmas/${classId}`);
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-32">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Etapa 3 de 3 · Revisão
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {questions.length} {questions.length === 1 ? "questão pronta" : "questões prontas"} —{" "}
          <span className="font-serif font-normal italic text-brand-primary">revise e salve</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-gray-500">
          Edite cada questão direto no card. Do lado direito, a pré-visualização mostra em
          tempo real como o aluno vai ver a prova.
        </p>

        {usage && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-primary/10 px-3 py-1.5 text-xs font-medium text-brand-primary">
            <Sparkles className="size-3.5" />
            {usage.credits} {usage.credits === 1 ? "crédito usado" : "créditos usados"}
          </div>
        )}
      </header>

      {regenError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {regenError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3">
          {questions.map((question, i) => (
            <QuestionEditor
              key={i}
              index={i}
              question={question}
              onChange={(patch) => updateQuestion(i, patch)}
              onRemove={() => removeQuestion(i)}
              onRegenerate={() => handleRegenerateAt(i)}
              alwaysExpanded
            />
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Adicionar questão manualmente
          </button>
        </section>

        <aside className="xl:sticky xl:top-[88px] xl:self-start xl:h-[calc(100vh-120px)]">
          <StudentPreview
            title={config.title || "Prova sem título"}
            description={config.description}
            duration={config.duration}
            questions={questions}
          />
        </aside>
      </div>

      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {saveError}
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <Button variant="ghost" size="md" onClick={() => setStep("config")} disabled={saving}>
            <ArrowLeft className="size-4" />
            Voltar pra configuração
          </Button>

          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
            <Save className="size-4" strokeWidth={2.5} />
            {saving ? "Salvando prova..." : "Salvar prova"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
