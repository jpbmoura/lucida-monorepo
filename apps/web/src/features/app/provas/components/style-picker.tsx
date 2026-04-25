"use client";

import {
  Zap,
  BookOpen,
  Brain,
  Lightbulb,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamStyle } from "../types";

export interface StyleOption {
  key: ExamStyle;
  label: string;
  tagline: string;
  description: string;
  Icon: LucideIcon;
}

interface StylePickerProps {
  value: ExamStyle;
  onChange: (value: ExamStyle) => void;
  /** Estilos base da Lucida. Default: os 4 built-in. */
  baseOptions?: StyleOption[];
  /**
   * Estilos customizados da instituição do professor.
   * Renderizados em seção separada. Vazio hoje — preparado pra quando
   * existir endpoint de estilos por organização.
   */
  customOptions?: StyleOption[];
}

const BASE_OPTIONS: StyleOption[] = [
  {
    key: "simple",
    label: "Simples",
    tagline: "Rápida e direta",
    description:
      "Questões objetivas, sem contexto. Boa para checagem rápida de conteúdo.",
    Icon: Zap,
  },
  {
    key: "contextual",
    label: "Contextual",
    tagline: "Estilo ENEM",
    description:
      "Cada questão parte de um cenário curto. Cobra interpretação + aplicação.",
    Icon: BookOpen,
  },
  {
    key: "analytical",
    label: "Analítica",
    tagline: "Estilo ENADE",
    description:
      "Raciocínio em múltiplos passos. Exige análise e comparação entre conceitos.",
    Icon: Brain,
  },
  {
    key: "reflective",
    label: "Reflexiva",
    tagline: "Metacognitiva",
    description:
      "Perguntas sobre implicação e interpretação. Boa pra livros, artigos e material cultural.",
    Icon: Lightbulb,
  },
];

export function StylePicker({
  value,
  onChange,
  baseOptions = BASE_OPTIONS,
  customOptions = [],
}: StylePickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <StyleGrid value={value} onChange={onChange} options={baseOptions} />

      {customOptions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            Estilos da sua instituição
            <span className="h-px flex-1 bg-gray-100" />
          </div>
          <StyleGrid value={value} onChange={onChange} options={customOptions} />
        </div>
      )}
    </div>
  );
}

function StyleGrid({
  value,
  onChange,
  options,
}: {
  value: ExamStyle;
  onChange: (v: ExamStyle) => void;
  options: StyleOption[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {options.map((opt) => (
        <StyleCard
          key={opt.key}
          option={opt}
          selected={value === opt.key}
          onSelect={() => onChange(opt.key)}
        />
      ))}
    </div>
  );
}

function StyleCard({
  option,
  selected,
  onSelect,
}: {
  option: StyleOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-brand-primary bg-brand-primary/5 shadow-soft"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
          selected
            ? "bg-brand-primary text-white"
            : "bg-gray-50 text-gray-500 group-hover:bg-gray-100",
        )}
      >
        <option.Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-medium text-ink">{option.label}</h3>
            <p className="text-[11px] text-gray-500">{option.tagline}</p>
          </div>
          {selected && (
            <span
              aria-hidden
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-primary text-white"
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          )}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-gray-500">
          {option.description}
        </p>
      </div>
    </button>
  );
}
