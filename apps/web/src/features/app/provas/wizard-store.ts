"use client";

import { create } from "zustand";
import type {
  ExamDifficulty,
  ExamStyle,
  GeneratedQuestion,
  GenerationUsage,
  QuestionType,
  WizardConfig,
} from "./types";

export type WizardStep = "material" | "config" | "generating" | "review";

interface WizardState {
  step: WizardStep;

  // material
  files: File[];
  pastedText: string;
  youtubeUrls: string[];

  // config
  config: WizardConfig;

  // review
  questions: GeneratedQuestion[];
  usage: GenerationUsage | null;
  generationError: string | null;

  // actions
  setStep: (step: WizardStep) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  setPastedText: (text: string) => void;
  addYoutubeUrl: (url: string) => void;
  removeYoutubeUrl: (index: number) => void;
  setConfig: (patch: Partial<WizardConfig>) => void;
  setGenerationResult: (questions: GeneratedQuestion[], usage: GenerationUsage) => void;
  setGenerationError: (error: string | null) => void;
  updateQuestion: (index: number, patch: Partial<GeneratedQuestion>) => void;
  replaceQuestion: (index: number, question: GeneratedQuestion) => void;
  removeQuestion: (index: number) => void;
  addQuestion: () => void;
  reset: () => void;
}

function defaultConfig(): WizardConfig {
  return {
    title: "",
    description: "",
    questionCount: 10,
    difficulty: "médio",
    style: "simple",
    questionTypes: { multipleChoice: true, trueFalse: false },
    duration: 0,
    securityLevel: "off",
  };
}

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
        ? ["Verdadeiro", "Falso"]
        : Array.from({ length: mcOptionCount }, () => ""),
    correctAnswer: 0,
    explanation: "",
    difficulty,
  };
}

function hasMaterial(
  files: File[],
  pastedText: string,
  youtubeUrls: string[],
): boolean {
  return (
    files.length > 0 ||
    pastedText.trim().length > 0 ||
    youtubeUrls.some((u) => u.trim().length > 0)
  );
}

export const useWizardStore = create<WizardState>((set) => ({
  step: "material",
  files: [],
  pastedText: "",
  youtubeUrls: [],
  config: defaultConfig(),
  questions: [],
  usage: null,
  generationError: null,

  setStep: (step) => set({ step }),

  addFiles: (files) =>
    set((s) => ({
      files: [...s.files, ...files].slice(0, 10),
    })),

  removeFile: (index) =>
    set((s) => ({
      files: s.files.filter((_, i) => i !== index),
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

  setGenerationResult: (questions, usage) =>
    set({
      questions,
      usage,
      generationError: null,
      step: "review",
    }),

  setGenerationError: (error) =>
    set({
      generationError: error,
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

  reset: () =>
    set({
      step: "material",
      files: [],
      pastedText: "",
      youtubeUrls: [],
      config: defaultConfig(),
      questions: [],
      usage: null,
      generationError: null,
    }),
}));

// Export helpers para consumidores
export function canProceedToConfig(
  state: Pick<WizardState, "files" | "pastedText" | "youtubeUrls">,
): boolean {
  return hasMaterial(state.files, state.pastedText, state.youtubeUrls);
}

export function canGenerate(state: Pick<WizardState, "config">): boolean {
  const { config } = state;
  if (config.title.trim().length < 2) return false;
  if (config.questionCount < 1 || config.questionCount > 50) return false;
  if (!config.questionTypes.multipleChoice && !config.questionTypes.trueFalse) return false;
  return true;
}

export type { WizardState };
export type { QuestionType, ExamStyle, ExamDifficulty };
