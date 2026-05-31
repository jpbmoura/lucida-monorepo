"use client";

import { create } from "zustand";
import {
  ExtractError,
  extractTextFromFile,
} from "./extractors/extract-text";
import type {
  ExamDifficulty,
  ExamStyle,
  GeneratedQuestion,
  GenerationProgress,
  GenerationUsage,
  QuestionType,
  WizardConfig,
} from "./types";

export type WizardStep = "material" | "config" | "generating" | "review";

export type MaterialFileStatus = "extracting" | "done" | "error";

export interface MaterialFile {
  id: string;
  name: string;
  size: number;
  status: MaterialFileStatus;
  text?: string;
  warning?: string;
  error?: string;
  /** Progresso de extração de PDF (página atual / total). */
  extractProgress?: { done: number; total: number };
}

interface WizardState {
  step: WizardStep;

  // material
  materialFiles: MaterialFile[];
  pastedText: string;
  youtubeUrls: string[];

  // config
  config: WizardConfig;

  // review
  questions: GeneratedQuestion[];
  usage: GenerationUsage | null;
  generationError: string | null;
  // Progresso do top-up loop durante a geração (null fora do passo
  // "generating" ou enquanto a 1ª rodada não fechou).
  generationProgress: GenerationProgress | null;

  // actions
  setStep: (step: WizardStep) => void;
  /**
   * Adiciona arquivos e dispara extração em paralelo no browser. O store
   * acompanha o ciclo de vida de cada um (extracting → done | error). Limita
   * o total a 10 — descarta o excedente silenciosamente, igual ao limite do
   * api antigo (multer files: 10).
   */
  addMaterialFiles: (files: File[]) => void;
  removeMaterialFile: (id: string) => void;
  setPastedText: (text: string) => void;
  addYoutubeUrl: (url: string) => void;
  removeYoutubeUrl: (index: number) => void;
  setConfig: (patch: Partial<WizardConfig>) => void;
  setGenerationProgress: (p: GenerationProgress) => void;
  setGenerationResult: (questions: GeneratedQuestion[], usage: GenerationUsage) => void;
  /**
   * Acumula consumo no `usage` existente (regenerar uma questão soma seus
   * créditos/tokens ao total da geração inicial). Idempotência fica por
   * conta do caller — só chamamos quando a API retornou sucesso.
   */
  addUsage: (delta: GenerationUsage) => void;
  setGenerationError: (error: string | null) => void;
  updateQuestion: (index: number, patch: Partial<GeneratedQuestion>) => void;
  replaceQuestion: (index: number, question: GeneratedQuestion) => void;
  removeQuestion: (index: number) => void;
  addQuestion: () => void;
  addOpenQuestion: () => void;
  reset: () => void;
}

function defaultConfig(): WizardConfig {
  return {
    title: "",
    description: "",
    questionCount: 10,
    openQuestionCount: 3,
    difficulty: "médio",
    style: "simple",
    questionTypes: { multipleChoice: true, trueFalse: false, open: false },
    language: "pt-BR",
    duration: 0,
    securityLevel: "off",
  };
}

// Rótulos V/F por idioma — espelha o backend (trueFalseLabels). Questão manual
// começa no idioma da prova pra bater com as geradas pela IA.
const TRUE_FALSE_LABELS: Record<WizardConfig["language"], [string, string]> = {
  "pt-BR": ["Verdadeiro", "Falso"],
  en: ["True", "False"],
  es: ["Verdadero", "Falso"],
};

function defaultQuestion(config: WizardConfig): GeneratedQuestion {
  const type: "multipleChoice" | "trueFalse" = config.questionTypes.multipleChoice
    ? "multipleChoice"
    : "trueFalse";
  const needsContext = config.style !== "simple";
  const difficulty =
    config.difficulty === "misto" ? "médio" : config.difficulty;
  // Alinhado com os prompts: contextual e analytical usam 5 opções;
  // simple e reflective usam 4. Questão manual começa no formato esperado.
  const mcOptionCount =
    config.style === "contextual" || config.style === "analytical" ? 5 : 4;
  return {
    type,
    statement: "",
    context: needsContext ? "" : null,
    options:
      type === "trueFalse"
        ? [...TRUE_FALSE_LABELS[config.language]]
        : Array.from({ length: mcOptionCount }, () => ""),
    correctAnswer: 0,
    explanation: "",
    difficulty,
  };
}

function newId(): string {
  return `mf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Discursiva manual: começa com 1 critério e 3 níveis (0/1/2 pts), pronto pro
// professor editar. Ids estáveis pra correção referenciar por id, não posição.
function defaultOpenQuestion(config: WizardConfig): GeneratedQuestion {
  const difficulty = config.difficulty === "misto" ? "médio" : config.difficulty;
  return {
    type: "open",
    statement: "",
    context: config.style !== "simple" ? "" : null,
    options: [],
    correctAnswer: -1,
    explanation: "",
    difficulty,
    referenceAnswer: "",
    rubric: {
      criteria: [
        {
          id: newId(),
          name: "Critério 1",
          description: null,
          levels: [
            { id: newId(), label: "Insuficiente", points: 0, descriptor: "" },
            { id: newId(), label: "Parcial", points: 1, descriptor: "" },
            { id: newId(), label: "Completo", points: 2, descriptor: "" },
          ],
        },
      ],
    },
  };
}

export const useWizardStore = create<WizardState>((set, get) => ({
  step: "material",
  materialFiles: [],
  pastedText: "",
  youtubeUrls: [],
  config: defaultConfig(),
  questions: [],
  usage: null,
  generationError: null,
  generationProgress: null,

  setStep: (step) => set({ step }),

  addMaterialFiles: (incoming) => {
    const slotsLeft = 10 - get().materialFiles.length;
    if (slotsLeft <= 0) return;
    const accepted = incoming.slice(0, slotsLeft);

    const newEntries: MaterialFile[] = accepted.map((file) => ({
      id: newId(),
      name: file.name,
      size: file.size,
      status: "extracting",
    }));

    set((s) => ({ materialFiles: [...s.materialFiles, ...newEntries] }));

    // Extrai cada um em paralelo. Cada result/error atualiza só sua entry pelo
    // id — independência total entre arquivos. Promise.allSettled não é
    // necessária porque cada um faz seu próprio set().
    accepted.forEach((file, i) => {
      const id = newEntries[i]!.id;
      void extractTextFromFile(file, (done, total) => {
        set((s) => ({
          materialFiles: s.materialFiles.map((mf) =>
            mf.id === id ? { ...mf, extractProgress: { done, total } } : mf,
          ),
        }));
      })
        .then((result) => {
          set((s) => ({
            materialFiles: s.materialFiles.map((mf) =>
              mf.id === id
                ? {
                    ...mf,
                    status: "done",
                    text: result.text,
                    warning: result.warning,
                    extractProgress: undefined,
                  }
                : mf,
            ),
          }));
        })
        .catch((err: unknown) => {
          const message =
            err instanceof ExtractError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Falha ao extrair texto.";
          set((s) => ({
            materialFiles: s.materialFiles.map((mf) =>
              mf.id === id
                ? { ...mf, status: "error", error: message }
                : mf,
            ),
          }));
        });
    });
  },

  removeMaterialFile: (id) =>
    set((s) => ({
      materialFiles: s.materialFiles.filter((mf) => mf.id !== id),
    })),

  setPastedText: (text) => set({ pastedText: text }),

  addYoutubeUrl: (url) =>
    set((s) => ({
      youtubeUrls: url.trim() ? [...s.youtubeUrls, url.trim()] : s.youtubeUrls,
    })),

  removeYoutubeUrl: (index) =>
    set((s) => ({
      youtubeUrls: s.youtubeUrls.filter((_, i) => i !== index),
    })),

  setConfig: (patch) =>
    set((s) => ({
      config: { ...s.config, ...patch },
    })),

  setGenerationProgress: (p) => set({ generationProgress: p }),

  setGenerationResult: (questions, usage) =>
    set({
      questions,
      usage,
      generationError: null,
      generationProgress: null,
      step: "review",
    }),

  addUsage: (delta) =>
    set((s) => ({
      usage: s.usage
        ? {
            inputTokens: s.usage.inputTokens + delta.inputTokens,
            outputTokens: s.usage.outputTokens + delta.outputTokens,
            credits: s.usage.credits + delta.credits,
          }
        : delta,
    })),

  setGenerationError: (error) =>
    set({
      generationError: error,
      generationProgress: null,
      step: "config",
    }),

  updateQuestion: (index, patch) =>
    set((s) => ({
      questions: s.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    })),

  replaceQuestion: (index, question) =>
    set((s) => ({
      questions: s.questions.map((q, i) => (i === index ? question : q)),
    })),

  removeQuestion: (index) =>
    set((s) => ({
      questions: s.questions.filter((_, i) => i !== index),
    })),

  addQuestion: () =>
    set((s) => ({
      questions: [...s.questions, defaultQuestion(s.config)],
    })),

  addOpenQuestion: () =>
    set((s) => ({
      questions: [...s.questions, defaultOpenQuestion(s.config)],
    })),

  reset: () =>
    set({
      step: "material",
      materialFiles: [],
      pastedText: "",
      youtubeUrls: [],
      config: defaultConfig(),
      questions: [],
      usage: null,
      generationError: null,
      generationProgress: null,
    }),
}));

/**
 * Junta texto colado + textos extraídos dos arquivos num só blob com
 * marcadores `### <label>` por fonte. O api lê isso como `pastedText`
 * (uma fonte única chamada "Texto colado") e o prompt da IA enxerga os
 * sub-headers como divisores entre arquivos. Sem arquivos novos no
 * multipart — payload fica em alguns KB.
 */
export function buildCombinedPastedText(
  state: Pick<WizardState, "materialFiles" | "pastedText">,
): string {
  const parts: string[] = [];
  for (const mf of state.materialFiles) {
    if (mf.status === "done" && mf.text && mf.text.length > 0) {
      parts.push(`### ${mf.name}\n${mf.text}`);
    }
  }
  const pasted = state.pastedText.trim();
  if (pasted) {
    parts.push(`### Trecho colado\n${pasted}`);
  }
  return parts.join("\n\n");
}

export function canProceedToConfig(
  state: Pick<WizardState, "materialFiles" | "pastedText" | "youtubeUrls">,
): boolean {
  // Bloqueia o "Continuar" enquanto algum arquivo ainda está extraindo —
  // evita seguir pra config sem saber se a extração vai falhar.
  if (state.materialFiles.some((mf) => mf.status === "extracting")) {
    return false;
  }
  const hasUsableFile = state.materialFiles.some(
    (mf) => mf.status === "done" && (mf.text?.length ?? 0) > 0,
  );
  const hasPasted = state.pastedText.trim().length > 0;
  const hasYoutube = state.youtubeUrls.some((u) => u.trim().length > 0);
  return hasUsableFile || hasPasted || hasYoutube;
}

export function canGenerate(state: Pick<WizardState, "config">): boolean {
  const { config } = state;
  if (config.title.trim().length < 2) return false;
  const wantObjective =
    config.questionTypes.multipleChoice || config.questionTypes.trueFalse;
  const wantOpen = config.questionTypes.open;
  if (!wantObjective && !wantOpen) return false;
  if (wantObjective && (config.questionCount < 1 || config.questionCount > 50)) {
    return false;
  }
  if (wantOpen && (config.openQuestionCount < 1 || config.openQuestionCount > 30)) {
    return false;
  }
  return true;
}

export type { WizardState };
export type { QuestionType, ExamStyle, ExamDifficulty };
