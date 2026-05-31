"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Check,
  Download,
  FileDown,
  Loader2,
  Palette,
  Play,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyBalanceChanged } from "@/features/app/billing/components/balance-widget";
import { cn } from "@/lib/utils";
import type {
  RegenerateSlideResult,
  Slide,
  SlideTheme,
  SlideTone,
} from "../types";
import { DeckFrame } from "./deck-frame";
import { SlideCanvas } from "./slide-canvas";
import { SortableThumb } from "./sortable-thumb";
import { SlideEditPanel } from "./slide-edit-panel";
import { ThemeGallery } from "./theme-gallery";
import { PresentOverlay } from "../present/present-overlay";
import { exportDeckToPptx } from "../export/pptx-export";

export interface DeckGenContext {
  source: "lesson-plan" | "material";
  lessonPlanId: string | null;
  tone: SlideTone;
  slideCount: number;
  includeNotes: boolean;
  includeActivity: boolean;
  language: "pt-BR" | "en" | "es";
  materialText: string;
  youtubeUrls: string[];
}

export interface DeckEditorInitial {
  slides: Slide[];
  theme: SlideTheme;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
}

export interface DeckPersistPayload {
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  slides: Slide[];
}

function blankSlide(): Slide {
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type: "content",
    title: "Novo slide",
    subtitle: null,
    blocks: [{ kind: "paragraph", text: "", emphasis: false }],
    columns: [],
    image: null,
    notes: null,
    bnccCodes: [],
  };
}

export function DeckEditor({
  mode,
  deckId,
  initial,
  genContext,
  onPersist,
}: {
  mode: "create" | "edit";
  deckId?: string;
  initial: DeckEditorInitial;
  genContext: DeckGenContext;
  onPersist: (payload: DeckPersistPayload) => Promise<{ id?: string } | void>;
}) {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>(initial.slides);
  const [theme, setTheme] = useState<SlideTheme>(initial.theme);
  const [meta, setMeta] = useState({
    title: initial.title,
    subject: initial.subject,
    gradeLevel: initial.gradeLevel,
    tone: initial.tone,
  });
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.slides[0]?.id ?? null,
  );
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const selected = slides.find((s) => s.id === selectedId) ?? null;

  function updateSlide(id: string, next: Slide) {
    setSlides((prev) => prev.map((s) => (s.id === id ? next : s)));
    setSaved(false);
  }

  function deleteSlide(id: string) {
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
    setSaved(false);
  }

  function addSlide() {
    const slide = blankSlide();
    setSlides((prev) => [...prev, slide]);
    setSelectedId(slide.id);
    setSaved(false);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlides((prev) => {
      const from = prev.findIndex((s) => s.id === active.id);
      const to = prev.findIndex((s) => s.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
    setSaved(false);
  }

  async function regenerate(id: string) {
    setRegeneratingId(id);
    try {
      const formData = new FormData();
      formData.append(
        "config",
        JSON.stringify({
          source: genContext.source,
          lessonPlanId: genContext.lessonPlanId ?? undefined,
          title: meta.title,
          subject: meta.subject,
          gradeLevel: meta.gradeLevel,
          tone: meta.tone,
          slideCount: genContext.slideCount,
          includeNotes: genContext.includeNotes,
          includeActivity: genContext.includeActivity,
          language: genContext.language,
          pastedText: genContext.materialText,
          youtubeUrls: genContext.youtubeUrls,
          currentSlides: slides,
          slideId: id,
        }),
      );
      const res = await fetch("/v1/ai/regenerate-slide", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Falha ao regenerar.");
      const body = (await res.json()) as { data: RegenerateSlideResult };
      updateSlide(id, body.data.slide);
      notifyBalanceChanged();
    } catch {
      // silencioso — o saldo não muda em falha
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    const result = await onPersist({
      title: meta.title,
      subject: meta.subject,
      gradeLevel: meta.gradeLevel,
      tone: meta.tone,
      theme,
      slides,
    });
    setSaving(false);
    if (result && "id" in result && result.id && mode === "create") {
      router.push(`/app/apresentacoes/${result.id}`);
      return;
    }
    setSaved(true);
  }

  async function exportPptx() {
    setExporting(true);
    try {
      await exportDeckToPptx({ title: meta.title, slides, theme });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-header,4rem))] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
        <Link
          href="/app/apresentacoes"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-ink"
          title="Voltar para Apresentações"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Apresentações</span>
        </Link>
        <input
          value={meta.title}
          onChange={(e) => {
            setMeta((m) => ({ ...m, title: e.target.value }));
            setSaved(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-ink outline-none"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowThemes((v) => !v)}>
            <Palette className="size-4" /> Tema
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPresenting(true)}>
            <Play className="size-4" /> Apresentar
          </Button>
          <Button size="sm" variant="outline" onClick={exportPptx} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PPTX
          </Button>
          {deckId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/print/slides/${deckId}`, "_blank")}
            >
              <FileDown className="size-4" /> PDF
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saved ? "Salvo" : mode === "create" ? "Salvar" : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {showThemes && (
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <ThemeGallery
            value={theme}
            onChange={(t) => {
              setTheme(t);
              setSaved(false);
            }}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Trilho de slides */}
        <DeckFrame
          theme={theme}
          className="w-44 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3"
        >
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {slides.map((slide, i) => (
                  <SortableThumb
                    key={slide.id}
                    slide={slide}
                    index={i}
                    selected={slide.id === selectedId}
                    onSelect={() => setSelectedId(slide.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            onClick={addSlide}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-ink"
          >
            <Plus className="size-3.5" /> Slide
          </button>
        </DeckFrame>

        {/* Preview do slide selecionado */}
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-gray-100 p-8">
          {selected && (
            <DeckFrame theme={theme} className="w-full max-w-4xl shadow-lg">
              <SlideCanvas slide={selected} />
            </DeckFrame>
          )}
        </div>

        {/* Painel de edição */}
        <div className="w-80 shrink-0 overflow-y-auto border-l border-gray-200 p-4">
          {selected ? (
            <SlideEditPanel
              slide={selected}
              onChange={(s) => updateSlide(selected.id, s)}
              onRegenerate={() => regenerate(selected.id)}
              onDelete={() => deleteSlide(selected.id)}
              regenerating={regeneratingId === selected.id}
              includeNotes={genContext.includeNotes}
            />
          ) : (
            <p className="text-sm text-gray-400">Selecione um slide.</p>
          )}
        </div>
      </div>

      {presenting && (
        <PresentOverlay
          slides={slides}
          theme={theme}
          startIndex={Math.max(slides.findIndex((s) => s.id === selectedId), 0)}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
}
