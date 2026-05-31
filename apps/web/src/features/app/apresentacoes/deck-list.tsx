"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Presentation, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlideDeckDTO } from "./types";
import { DeckFrame } from "./components/deck-frame";
import { SlideThumb } from "./components/slide-thumb";
import { BetaNotice } from "./components/beta-notice";
import { deleteSlideDeckAction } from "./actions";

export function DeckList({ decks }: { decks: SlideDeckDTO[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta apresentação? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    await deleteSlideDeckAction(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Apresentações</h1>
          <p className="mt-1 text-sm text-gray-500">Slides gerados por IA, prontos pra editar e apresentar.</p>
        </div>
        <Button asChild>
          <Link href="/app/apresentacoes/nova">
            <Plus className="size-4" /> Nova apresentação
          </Link>
        </Button>
      </div>

      <BetaNotice className="mb-8" />

      {decks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Presentation className="size-8 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhuma apresentação ainda.</p>
          <Button asChild variant="outline">
            <Link href="/app/apresentacoes/nova">Criar a primeira</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const cover = deck.slides[0];
            return (
              <div
                key={deck.id}
                className="group relative overflow-hidden rounded-xl border border-gray-200 transition hover:border-gray-300 hover:shadow-sm"
              >
                <Link href={`/app/apresentacoes/${deck.id}`}>
                  {cover ? (
                    <DeckFrame theme={deck.theme} className="border-b border-gray-200">
                      <SlideThumb slide={cover} />
                    </DeckFrame>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-100 text-2xl font-semibold text-gray-400">
                      Aa
                    </div>
                  )}
                  <div className="p-4">
                    <p className="truncate font-medium text-ink">{deck.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {deck.slides.length} slides
                      {deck.subject ? ` · ${deck.subject}` : ""}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(deck.id)}
                  disabled={deletingId === deck.id}
                  className={cn(
                    "absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-gray-500 opacity-0 backdrop-blur transition hover:text-red-600 group-hover:opacity-100",
                    deletingId === deck.id && "opacity-100",
                  )}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
