"use client";

import { useState } from "react";
import { Plus, X, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface YoutubeInputProps {
  urls: string[];
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

export function YoutubeInput({ urls, onAdd, onRemove }: YoutubeInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!YOUTUBE_REGEX.test(trimmed)) {
      setError("Link inválido. Cole uma URL do YouTube (youtube.com ou youtu.be).");
      return;
    }
    onAdd(trimmed);
    setDraft("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Youtube className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="url"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="https://youtube.com/watch?v=..."
            className="pl-10"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleAdd}
          disabled={draft.trim().length === 0}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Adicionar
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {urls.length > 0 && (
        <ul className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-500">
                <Youtube className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink">{url}</div>
                <div className="text-[11px] text-gray-500">
                  Legendas serão baixadas na hora de gerar
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remover link"
                className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-gray-400">
        Só funciona se o vídeo tem legendas públicas disponíveis.
      </p>
    </div>
  );
}
