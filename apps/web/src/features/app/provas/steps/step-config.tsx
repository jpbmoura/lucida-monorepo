"use client";

import { ArrowLeft, ArrowRight, Sparkles, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StylePicker } from "../components/style-picker";
import { useWizardStore, canGenerate } from "../wizard-store";
import type { ExamDifficulty, SecurityLevel } from "../types";

interface StepConfigProps {
  onGenerate: () => void;
}

export function StepConfig({ onGenerate }: StepConfigProps) {
  const config = useWizardStore((s) => s.config);
  const setConfig = useWizardStore((s) => s.setConfig);
  const setStep = useWizardStore((s) => s.setStep);
  const generationError = useWizardStore((s) => s.generationError);

  const canProceed = canGenerate({ config });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Etapa 2 de 3 · Configuração
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Como a prova vai{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            se parecer
          </span>
          ?
        </h1>
        <p className="mt-3 max-w-lg text-[15px] text-gray-500">
          Nome, estilo, tipo de questões — e como a prova vai ser aplicada.
        </p>
      </header>

      {generationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generationError}
        </div>
      )}

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="exam-title">Título</Label>
          <Input
            id="exam-title"
            value={config.title}
            onChange={(e) => setConfig({ title: e.target.value })}
            placeholder="Ex: Funções do 1º grau — P2"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="exam-description">Descrição (opcional)</Label>
          <Textarea
            id="exam-description"
            value={config.description}
            onChange={(e) => setConfig({ description: e.target.value })}
            placeholder="Breve descrição da prova, pontos que estão sendo avaliados..."
            className="min-h-[90px]"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Label>Estilo das questões</Label>
        <StylePicker value={config.style} onChange={(style) => setConfig({ style })} />
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Label htmlFor="question-count">Quantidade de questões</Label>
          <div className="flex items-center gap-3">
            <input
              id="question-count"
              type="range"
              min={1}
              max={50}
              value={config.questionCount}
              onChange={(e) => setConfig({ questionCount: Number(e.target.value) })}
              className="flex-1 accent-brand-primary"
            />
            <span className="w-10 text-right text-lg font-medium tabular-nums text-ink">
              {config.questionCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Dificuldade</Label>
          <div className="grid grid-cols-2 gap-1 rounded-pill bg-gray-50 p-1">
            {(["fácil", "médio", "difícil", "misto"] as ExamDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setConfig({ difficulty: d })}
                className={cn(
                  "rounded-pill px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  config.difficulty === d
                    ? "bg-white text-ink shadow-soft"
                    : "text-gray-500 hover:text-ink",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Tipos de questão</Label>
          <div className="flex flex-col gap-2">
            <TypeCheckbox
              checked={config.questionTypes.multipleChoice}
              onChange={(v) =>
                setConfig({
                  questionTypes: { ...config.questionTypes, multipleChoice: v },
                })
              }
              label="Múltipla escolha"
              hint="4 ou 5 opções, 1 correta"
            />
            <TypeCheckbox
              checked={config.questionTypes.trueFalse}
              onChange={(v) =>
                setConfig({
                  questionTypes: { ...config.questionTypes, trueFalse: v },
                })
              }
              label="Verdadeiro ou falso"
              hint="Resposta binária"
            />
          </div>
        </div>
      </section>

      <SecuritySection
        duration={config.duration}
        securityLevel={config.securityLevel}
        onDurationChange={(v) => setConfig({ duration: v })}
        onSecurityChange={(v) => setConfig({ securityLevel: v })}
      />

      <footer className="flex flex-col gap-3 border-t border-gray-100 pt-6 md:flex-row md:items-center md:justify-between">
        <Button variant="ghost" size="sm" onClick={() => setStep("material")}>
          <ArrowLeft className="size-3.5" />
          Voltar
        </Button>

        <Button variant="primary" size="lg" disabled={!canProceed} onClick={onGenerate}>
          <Sparkles className="size-4" strokeWidth={2.5} />
          Gerar com a Lulu
        </Button>
      </footer>
    </div>
  );
}

// Seção Segurança & tempo — agrupa duração e modo estrito porque ambos
// controlam a experiência durante a aplicação (não a geração).
function SecuritySection({
  duration,
  securityLevel,
  onDurationChange,
  onSecurityChange,
}: {
  duration: number;
  securityLevel: SecurityLevel;
  onDurationChange: (v: number) => void;
  onSecurityChange: (v: SecurityLevel) => void;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-white text-gray-600 shadow-soft">
          <Shield className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-medium text-ink">Segurança e tempo</h2>
          <p className="text-xs text-gray-500">
            Como a prova é aplicada — tempo máximo e proteção contra trapaça.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="exam-duration" className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-gray-500" />
            Duração (minutos)
          </Label>
          <Input
            id="exam-duration"
            type="number"
            min={0}
            max={600}
            value={duration || ""}
            onChange={(e) => onDurationChange(Number(e.target.value) || 0)}
            placeholder="0 = sem limite"
          />
          <p className="text-[11px] text-gray-500">
            Contagem regressiva no lado do aluno. Auto-envio quando zerar.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Modo de segurança</Label>
          <div className="grid grid-cols-2 gap-1 rounded-pill bg-gray-100 p-1">
            <SecurityToggle
              active={securityLevel === "off"}
              onClick={() => onSecurityChange("off")}
              label="Livre"
            />
            <SecurityToggle
              active={securityLevel === "strict"}
              onClick={() => onSecurityChange("strict")}
              label="Estrito"
            />
          </div>
          {securityLevel === "strict" ? (
            <StrictLevelExplanation />
          ) : (
            <p className="text-[11px] text-gray-500">
              Aluno pode consultar material e sair da aba livremente. Padrão.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function SecurityToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-white text-ink shadow-soft" : "text-gray-500 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function StrictLevelExplanation() {
  return (
    <ul className="space-y-1 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2.5 text-[11px] leading-relaxed text-brand-primary">
      <li>• Detecta troca de aba e perda de foco da janela</li>
      <li>• Bloqueia menu de contexto, cópia e atalhos comuns</li>
      <li>• Aviso a cada violação — 3ª finaliza a prova automaticamente</li>
      <li>• Todas as violações ficam registradas nas submissões</li>
    </ul>
  );
}

function TypeCheckbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked
          ? "border-brand-primary bg-brand-primary/5"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-brand-primary"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] text-gray-500">{hint}</span>
      </span>
    </label>
  );
}
