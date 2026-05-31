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
  GenerationUsage,
  Slide,
  SlideSourceType,
  SlideTheme,
  SlideTone,
  OutputLanguage,
} from "./types";

export type DeckStep = "source" | "config" | "generating" | "editor";

interface DeckWizardConfig {
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  slideCount: number;
  includeNotes: boolean;
  includeActivity: boolean;
  language: OutputLanguage;
}

interface DeckWizardState {
  step: DeckStep;
  source: SlideSourceType;
  lessonPlanId: string | null;
  lessonPlanTitle: string | null;

  materialFiles: MaterialFile[];
  pastedText: string;
  youtubeUrls: string[];

  config: DeckWizardConfig;
  theme: SlideTheme;
  /** Vira true quando o usuário escolhe um tema — impede a sugestão da IA de sobrescrever. */
  themeChosen: boolean;

  // Geração (streaming slide-a-slide).
  liveSlides: Slide[];
  progress: { delivered: number; requested: number } | null;

  // Resultado / editor.
  slides: Slide[];
  usage: GenerationUsage | null;
  generationError: string | null;

  setStep: (step: DeckStep) => void;
  setSource: (source: SlideSourceType) => void;
  setLessonPlan: (input: {
    id: string;
    title: string;
    subject?: string;
    gradeLevel?: string;
  }) => void;
  setConfig: (patch: Partial<DeckWizardConfig>) => void;
  setTheme: (theme: SlideTheme) => void;
  addMaterialFiles: (files: File[]) => void;
  removeMaterialFile: (id: string) => void;
  setPastedText: (text: string) => void;
  addYoutubeUrl: (url: string) => void;
  removeYoutubeUrl: (index: number) => void;

  startGenerating: () => void;
  pushLiveSlide: (slide: Slide) => void;
  setProgress: (p: { delivered: number; requested: number }) => void;
  setGenerationResult: (input: {
    slides: Slide[];
    suggestedTheme: SlideTheme;
    usage: GenerationUsage;
    title: string;
    subject: string;
    gradeLevel: string;
  }) => void;
  setGenerationError: (error: string | null) => void;

  setSlides: (slides: Slide[]) => void;
  updateSlide: (id: string, slide: Slide) => void;
  removeSlide: (id: string) => void;
  addUsage: (delta: GenerationUsage) => void;

  reset: () => void;
}

function defaultConfig(): DeckWizardConfig {
  return {
    title: "",
    subject: "",
    gradeLevel: "",
    tone: "didatico",
    slideCount: 10,
    includeNotes: false,
    includeActivity: true,
    language: "pt-BR",
  };
}

function newId(): string {
  return `mf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useDeckWizardStore = create<DeckWizardState>((set, get) => ({
  step: "source",
  source: "material",
  lessonPlanId: null,
  lessonPlanTitle: null,
  materialFiles: [],
  pastedText: "",
  youtubeUrls: [],
  config: defaultConfig(),
  theme: "papel",
  themeChosen: false,
  liveSlides: [],
  progress: null,
  slides: [],
  usage: null,
  generationError: null,

  setStep: (step) => set({ step }),
  setSource: (source) => set({ source }),
  setLessonPlan: ({ id, title, subject, gradeLevel }) =>
    set((s) => ({
      source: "lesson-plan",
      lessonPlanId: id,
      lessonPlanTitle: title,
      config: {
        ...s.config,
        title: s.config.title || title,
        subject: subject ?? s.config.subject,
        gradeLevel: gradeLevel ?? s.config.gradeLevel,
      },
    })),
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setTheme: (theme) => set({ theme, themeChosen: true }),

  // Mesma mecânica do wizard de provas/aulas — extrai no browser, teto de 10.
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
    set((s) => ({ materialFiles: s.materialFiles.filter((mf) => mf.id !== id) })),
  setPastedText: (text) => set({ pastedText: text }),
  addYoutubeUrl: (url) =>
    set((s) => ({
      youtubeUrls: url.trim() ? [...s.youtubeUrls, url.trim()] : s.youtubeUrls,
    })),
  removeYoutubeUrl: (index) =>
    set((s) => ({ youtubeUrls: s.youtubeUrls.filter((_, i) => i !== index) })),

  startGenerating: () =>
    set({ step: "generating", liveSlides: [], progress: null, generationError: null }),
  pushLiveSlide: (slide) =>
    set((s) => ({ liveSlides: [...s.liveSlides, slide] })),
  setProgress: (p) => set({ progress: p }),
  setGenerationResult: ({ slides, suggestedTheme, usage, title, subject, gradeLevel }) =>
    set((s) => ({
      slides,
      usage,
      // Respeita a escolha do professor; senão aplica a sugestão da IA.
      theme: s.themeChosen ? s.theme : suggestedTheme,
      step: "editor",
      generationError: null,
      config: {
        ...s.config,
        title: s.config.title || title,
        subject: s.config.subject || subject,
        gradeLevel: s.config.gradeLevel || gradeLevel,
      },
    })),
  setGenerationError: (error) => set({ generationError: error, step: "config" }),

  setSlides: (slides) => set({ slides }),
  updateSlide: (id, slide) =>
    set((s) => ({ slides: s.slides.map((sl) => (sl.id === id ? slide : sl)) })),
  removeSlide: (id) =>
    set((s) => ({ slides: s.slides.filter((sl) => sl.id !== id) })),
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

  reset: () =>
    set({
      step: "source",
      source: "material",
      lessonPlanId: null,
      lessonPlanTitle: null,
      materialFiles: [],
      pastedText: "",
      youtubeUrls: [],
      config: defaultConfig(),
      theme: "papel",
      themeChosen: false,
      liveSlides: [],
      progress: null,
      slides: [],
      usage: null,
      generationError: null,
    }),
}));

export { buildCombinedPastedText };

export function deckHasUsableMaterial(
  state: Pick<DeckWizardState, "source" | "materialFiles" | "pastedText" | "youtubeUrls" | "lessonPlanId">,
): boolean {
  if (state.source === "lesson-plan") return !!state.lessonPlanId;
  const hasFile = state.materialFiles.some(
    (mf) => mf.status === "done" && (mf.text?.length ?? 0) > 0,
  );
  return hasFile || state.pastedText.trim().length > 0 || state.youtubeUrls.length > 0;
}
