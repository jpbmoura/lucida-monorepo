"use client";

import { useState } from "react";
import { ImageIcon, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Slide, SlideBlock } from "../types";
import { SLIDE_TYPE_LABEL } from "../types";
import { ImagePickerDialog, type PickedImage } from "./image-picker-dialog";

export function SlideEditPanel({
  slide,
  onChange,
  onRegenerate,
  onDelete,
  regenerating,
  includeNotes,
}: {
  slide: Slide;
  onChange: (slide: Slide) => void;
  onRegenerate: () => void;
  onDelete: () => void;
  regenerating: boolean;
  includeNotes: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function patch(next: Partial<Slide>) {
    onChange({ ...slide, ...next });
  }
  function patchBlock(index: number, block: SlideBlock) {
    patch({ blocks: slide.blocks.map((b, i) => (i === index ? block : b)) });
  }

  function setImage(picked: PickedImage | null) {
    if (!picked) {
      patch({ image: slide.image ? { ...slide.image, url: null, thumbUrl: null } : null });
      return;
    }
    patch({
      image: {
        query: slide.image?.query ?? "",
        required: true,
        alt: picked.alt,
        url: picked.url,
        thumbUrl: picked.thumbUrl,
        photographer: picked.photographer,
        photographerUrl: picked.photographerUrl,
        sourceUrl: picked.sourceUrl,
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {SLIDE_TYPE_LABEL[slide.type]}
        </span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Regenerar
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Excluir slide">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Título</Label>
        <Input value={slide.title} onChange={(e) => patch({ title: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Subtítulo</Label>
        <Input
          value={slide.subtitle ?? ""}
          onChange={(e) => patch({ subtitle: e.target.value || null })}
        />
      </div>

      {slide.blocks.map((block, i) => (
        <BlockEditor key={i} block={block} onChange={(b) => patchBlock(i, b)} />
      ))}

      {/* Imagem */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <ImageIcon className="size-4" /> Imagem
          </Label>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              {slide.image?.url ? "Trocar" : "Adicionar"}
            </Button>
            {slide.image?.url && (
              <Button size="sm" variant="ghost" onClick={() => setImage(null)} aria-label="Remover imagem">
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {slide.image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image.thumbUrl ?? slide.image.url} alt="" className="aspect-video w-full rounded-md object-cover" />
        )}
      </div>

      {includeNotes && (
        <div className="flex flex-col gap-1.5">
          <Label>Notas do apresentador</Label>
          <Textarea
            value={slide.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || null })}
            className="min-h-20"
          />
        </div>
      )}

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialQuery={slide.image?.query || slide.title}
        alt={slide.image?.alt || slide.title}
        onSelect={setImage}
      />
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
}: {
  block: SlideBlock;
  onChange: (block: SlideBlock) => void;
}) {
  if (block.kind === "paragraph") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-gray-400">Parágrafo</Label>
        <Textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className="min-h-16"
        />
      </div>
    );
  }
  if (block.kind === "callout") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-gray-400">Destaque</Label>
        <Textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className="min-h-16"
        />
      </div>
    );
  }
  if (block.kind === "formula") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-gray-400">Fórmula (LaTeX)</Label>
        <Input
          value={block.latex}
          onChange={(e) => onChange({ ...block, latex: e.target.value })}
          className="font-mono"
        />
      </div>
    );
  }
  // bullets
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-gray-400">Tópicos (um por linha)</Label>
      <Textarea
        value={block.items.join("\n")}
        onChange={(e) =>
          onChange({ ...block, items: e.target.value.split("\n").filter((l) => l.trim()) })
        }
        className="min-h-20"
      />
    </div>
  );
}
