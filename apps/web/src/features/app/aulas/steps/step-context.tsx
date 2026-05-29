"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropZone } from "@/features/app/provas/components/drop-zone";
import {
  aulaHasUsableContext,
  aulaHasUsableMaterial,
  useAulaWizardStore,
} from "../wizard-store";
import { SEGMENT_META } from "../types";

interface StepContextProps {
  onGenerate: () => void;
}

// Rótulos do campo "nível" por segmento.
const LEVEL_LABEL: Record<string, string> = {
  FUNDAMENTAL: "Ano / série",
  MEDIO: "Série",
  FACULDADE: "Período / semestre",
  INFOPRODUTOR: "Módulo / nível",
};

export function StepContext({ onGenerate }: StepContextProps) {
  const config = useAulaWizardStore((s) => s.config);
  const setConfig = useAulaWizardStore((s) => s.setConfig);
  const setStep = useAulaWizardStore((s) => s.setStep);
  const materialFiles = useAulaWizardStore((s) => s.materialFiles);
  const addMaterialFiles = useAulaWizardStore((s) => s.addMaterialFiles);
  const removeMaterialFile = useAulaWizardStore((s) => s.removeMaterialFile);
  const pastedText = useAulaWizardStore((s) => s.pastedText);
  const setPastedText = useAulaWizardStore((s) => s.setPastedText);
  const youtubeUrls = useAulaWizardStore((s) => s.youtubeUrls);
  const addYoutubeUrl = useAulaWizardStore((s) => s.addYoutubeUrl);
  const removeYoutubeUrl = useAulaWizardStore((s) => s.removeYoutubeUrl);
  const generationError = useAulaWizardStore((s) => s.generationError);

  const [youtubeDraft, setYoutubeDraft] = useState("");
  const hasContext = aulaHasUsableContext({ config });
  const hasMaterial = aulaHasUsableMaterial({
    materialFiles,
    pastedText,
    youtubeUrls,
  });
  const extracting = materialFiles.some((mf) => mf.status === "extracting");
  const canGenerate = hasContext && hasMaterial && !extracting;

  return (
    <div className="flex flex-col gap-8 pb-28">
      <header>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span>Etapa 2 de 3 · Contexto</span>
          <span className="size-0.5 rounded-full bg-gray-300" />
          {/* Mostra o segmento escolhido na etapa 1 + atalho pra trocar. */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary/10 px-2 py-0.5 normal-case tracking-normal text-brand-primary">
            {SEGMENT_META[config.segment].label}
            <button
              type="button"
              onClick={() => setStep("segment")}
              className="underline underline-offset-2 hover:no-underline"
            >
              trocar
            </button>
          </span>
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Sobre o que é a{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            aula?
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-gray-500">
          Preencha o essencial e envie o material — texto, documento ou vídeo —
          que a Lulu vai usar como base do plano.
        </p>
      </header>

      {generationError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {generationError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="title">Tema da aula</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => setConfig({ title: e.target.value })}
            placeholder="Ex: Revolução Industrial e suas consequências sociais"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="subject">Disciplina / área (opcional)</Label>
          <Input
            id="subject"
            value={config.subject}
            onChange={(e) => setConfig({ subject: e.target.value })}
            placeholder="Deixe em branco pra IA inferir"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="level">{LEVEL_LABEL[config.segment]} (opcional)</Label>
          <Input
            id="level"
            value={config.level}
            onChange={(e) => setConfig({ level: e.target.value })}
            placeholder="Deixe em branco pra IA inferir"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="duration">Duração (minutos)</Label>
          <Input
            id="duration"
            type="number"
            min={1}
            max={600}
            value={config.durationMinutes}
            onChange={(e) =>
              setConfig({ durationMinutes: Number(e.target.value) || 0 })
            }
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Material de apoio</Label>
        <DropZone
          files={materialFiles}
          onAdd={addMaterialFiles}
          onRemove={removeMaterialFile}
        />
        <Textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={4}
          placeholder="Ou cole aqui um trecho do conteúdo…"
          className="resize-y"
        />

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={youtubeDraft}
              onChange={(e) => setYoutubeDraft(e.target.value)}
              placeholder="Link de vídeo do YouTube"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addYoutubeUrl(youtubeDraft);
                  setYoutubeDraft("");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="md"
              className="sm:w-auto"
              onClick={() => {
                addYoutubeUrl(youtubeDraft);
                setYoutubeDraft("");
              }}
            >
              Adicionar
            </Button>
          </div>
          {youtubeUrls.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {youtubeUrls.map((url, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-600"
                >
                  <span className="truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeYoutubeUrl(i)}
                    aria-label="Remover vídeo"
                    className="grid size-6 shrink-0 place-items-center rounded text-gray-400 hover:bg-gray-100 hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasContext && !hasMaterial && !extracting && (
          <p className="text-xs text-gray-500">
            Envie um arquivo, cole um texto ou adicione um vídeo pra continuar.
          </p>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button variant="ghost" size="md" onClick={() => setStep("segment")}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            <Sparkles className="size-4" strokeWidth={2.5} />
            {extracting ? "Extraindo material…" : "Gerar plano"}
            {!extracting && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
