"use client";

import { create } from "zustand";
import {
  ExtractError,
  extractTextFromFile,
} from "@/features/app/provas/extractors/extract-text";
import {
  buildCombinedPastedText,
  type MaterialFile,
} from "@/features/app/provas/wizard-store";
import type {
  AulaConfig,
  GenerationUsage,
  LessonPlanBlockKey,
  LessonPlanContent,
  LessonPlanSegment,
} from "./types";

export type AulaStep = "segment" | "context" | "generating" | "canvas";

interface AulaWizardState {
  step: AulaStep;
  config: AulaConfig;
  /** Vira true quando o usuário escolhe um segmento explicitamente (step 1). */
  segmentChosen: boolean;

  materialFiles: MaterialFile[];
  pastedText: string;
  youtubeUrls: string[];

  plan: LessonPlanContent | null;
  usage: GenerationUsage | null;
  generationError: string | null;

  setStep: (step: AulaStep) => void;
  setSegment: (segment: LessonPlanSegment) => void;
  setConfig: (patch: Partial<AulaConfig>) => void;
  addMaterialFiles: (files: File[]) => void;
  removeMaterialFile: (id: string) => void;
  setPastedText: (text: string) => void;
  addYoutubeUrl: (url: string) => void;
  removeYoutubeUrl: (index: number) => void;
  setGenerationResult: (plan: LessonPlanContent, usage: GenerationUsage) => void;
  setBlock: (key: LessonPlanBlockKey, value: string | string[]) => void;
  addUsage: (delta: GenerationUsage) => void;
  setGenerationError: (error: string | null) => void;
  reset: () => void;
}

function defaultConfig(): AulaConfig {
  return {
    segment: "FUNDAMENTAL",
    title: "",
    subject: "",
    level: "",
    durationMinutes: 50,
    language: "pt-BR",
  };
}

function newId(): string {
  return `mf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useAulaWizardStore = create<AulaWizardState>((set, get) => ({
  step: "segment",
  config: defaultConfig(),
  segmentChosen: false,
  materialFiles: [],
  pastedText: "",
  youtubeUrls: [],
  plan: null,
  usage: null,
  generationError: null,

  setStep: (step) => set({ step }),
  setSegment: (segment) =>
    set((s) => ({ config: { ...s.config, segment }, segmentChosen: true })),
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  // Mesma mecânica do wizard de provas — extrai no browser, acompanha o ciclo
  // de vida por id, teto de 10 arquivos.
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
              mf.id === id ? { ...mf, status: "error", error: message } : mf,
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

  setGenerationResult: (plan, usage) =>
    set({ plan, usage, generationError: null, step: "canvas" }),

  setBlock: (key, value) =>
    set((s) => (s.plan ? { plan: { ...s.plan, [key]: value } } : {})),

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
    set({ generationError: error, step: "context" }),

  reset: () =>
    set({
      step: "segment",
      config: defaultConfig(),
      segmentChosen: false,
      materialFiles: [],
      pastedText: "",
      youtubeUrls: [],
      plan: null,
      usage: null,
      generationError: null,
    }),
}));

export { buildCombinedPastedText };

export function aulaHasUsableContext(
  state: Pick<AulaWizardState, "config">,
): boolean {
  const { config } = state;
  // Disciplina e nível são OPCIONAIS — a IA infere a partir do material quando
  // ficam em branco. Só o tema e a duração são exigidos.
  return config.title.trim().length >= 2 && config.durationMinutes >= 1;
}

// Material é OBRIGATÓRIO: precisa de ao menos um arquivo extraído, texto colado
// ou link de vídeo. Espelha canProceedToConfig do wizard de provas.
export function aulaHasUsableMaterial(
  state: Pick<AulaWizardState, "materialFiles" | "pastedText" | "youtubeUrls">,
): boolean {
  const hasUsableFile = state.materialFiles.some(
    (mf) => mf.status === "done" && (mf.text?.length ?? 0) > 0,
  );
  const hasPasted = state.pastedText.trim().length > 0;
  const hasYoutube = state.youtubeUrls.some((u) => u.trim().length > 0);
  return hasUsableFile || hasPasted || hasYoutube;
}
