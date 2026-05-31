import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { SlideDeckDTO } from "./types";

export async function fetchSlideDeck(id: string): Promise<SlideDeckDTO> {
  const res = await apiFetch<{ data: SlideDeckDTO }>(
    `/v1/slide-decks/${encodeURIComponent(id)}`,
  );
  return res.data;
}

export async function fetchSlideDecks(): Promise<SlideDeckDTO[]> {
  const res = await apiFetch<{ data: SlideDeckDTO[] }>("/v1/slide-decks");
  return res.data;
}
