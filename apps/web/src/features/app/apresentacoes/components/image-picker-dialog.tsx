"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface PickedImage {
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  alt: string;
}

interface ImageResultDTO {
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  initialQuery,
  alt,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
  alt: string;
  onSelect: (image: PickedImage) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ImageResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/v1/ai/images?q=${encodeURIComponent(query.trim())}`);
      const body = (await res.json()) as { data?: ImageResultDTO[] };
      setResults(body.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trocar imagem</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Descreva a cena (em inglês funciona melhor)…"
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>

        <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto">
          {results.map((img) => (
            <button
              key={img.url}
              onClick={() => {
                onSelect({ ...img, alt });
                onOpenChange(false);
              }}
              className="overflow-hidden rounded-lg border border-gray-200 transition hover:ring-2 hover:ring-brand-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbUrl} alt="" className="aspect-video w-full object-cover" />
            </button>
          ))}
        </div>

        {searched && !loading && results.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            Nenhuma imagem encontrada. Tente outros termos (ou verifique se o Pexels está configurado).
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
