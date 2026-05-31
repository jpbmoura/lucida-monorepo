"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDeckWizardStore } from "../wizard-store";
import { TONE_META, type SlideTone } from "../types";
import { ThemeGallery } from "../components/theme-gallery";

interface StepConfigProps {
  onGenerate: () => void;
}

export function StepConfig({ onGenerate }: StepConfigProps) {
  const config = useDeckWizardStore((s) => s.config);
  const setConfig = useDeckWizardStore((s) => s.setConfig);
  const theme = useDeckWizardStore((s) => s.theme);
  const setTheme = useDeckWizardStore((s) => s.setTheme);
  const setStep = useDeckWizardStore((s) => s.setStep);

  const canGenerate = config.title.trim().length >= 2 && config.slideCount >= 3;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Configuração</h1>
        <p className="mt-1 text-sm text-gray-500">Ajuste o deck antes de gerar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => setConfig({ title: e.target.value })}
            placeholder="Ex.: Função do 2º grau"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="subject">Disciplina</Label>
          <Input
            id="subject"
            value={config.subject}
            onChange={(e) => setConfig({ subject: e.target.value })}
            placeholder="(opcional — a IA infere)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="grade">Série / nível</Label>
          <Input
            id="grade"
            value={config.gradeLevel}
            onChange={(e) => setConfig({ gradeLevel: e.target.value })}
            placeholder="(opcional — a IA infere)"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="count">Número de slides: {config.slideCount}</Label>
        <input
          id="count"
          type="range"
          min={3}
          max={24}
          value={config.slideCount}
          onChange={(e) => setConfig({ slideCount: Number(e.target.value) })}
          className="accent-brand-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tom</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(TONE_META) as SlideTone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setConfig({ tone: t })}
              className={cn(
                "rounded-lg border p-2.5 text-left transition-colors",
                config.tone === t
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <p className="text-sm font-medium text-ink">{TONE_META[t].label}</p>
              <p className="text-[11px] text-gray-500">{TONE_META[t].description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tema visual</Label>
        <ThemeGallery value={theme} onChange={setTheme} />
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          label="Incluir notas do apresentador"
          checked={config.includeNotes}
          onChange={(v) => setConfig({ includeNotes: v })}
        />
        <Toggle
          label="Incluir slide de atividade de saída"
          checked={config.includeActivity}
          onChange={(v) => setConfig({ includeActivity: v })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("source")}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button disabled={!canGenerate} onClick={onGenerate}>
          <Sparkles className="size-4" /> Gerar apresentação <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-gray-300"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-brand-primary" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
