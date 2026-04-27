"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  CardPriority,
  CardStatus,
  KanbanActionResult,
  KanbanCard,
  KanbanVoidActionResult,
  ListCardsResponse,
  SingleCardResponse,
} from "./types";

export async function fetchCards(): Promise<KanbanCard[]> {
  const data = await apiFetch<ListCardsResponse>("/api/kintal/board/cards");
  return data.cards;
}

export async function createCardAction(input: {
  title: string;
  description?: string;
  status?: CardStatus;
  priority?: CardPriority;
  assigneeId?: string | null;
  tags?: string[];
}): Promise<KanbanActionResult> {
  try {
    const data = await apiFetch<SingleCardResponse>(
      "/api/kintal/board/cards",
      { method: "POST", body: input },
    );
    revalidatePath("/kintal/board");
    return { ok: true, card: data.card };
  } catch (err) {
    return toCardResult(err);
  }
}

export async function updateCardAction(
  cardId: string,
  patch: {
    title?: string;
    description?: string;
    priority?: CardPriority;
    assigneeId?: string | null;
    tags?: string[];
  },
): Promise<KanbanActionResult> {
  try {
    const data = await apiFetch<SingleCardResponse>(
      `/api/kintal/board/cards/${encodeURIComponent(cardId)}`,
      { method: "PATCH", body: patch },
    );
    revalidatePath("/kintal/board");
    return { ok: true, card: data.card };
  } catch (err) {
    return toCardResult(err);
  }
}

export async function moveCardAction(
  cardId: string,
  status: CardStatus,
): Promise<KanbanActionResult> {
  try {
    const data = await apiFetch<SingleCardResponse>(
      `/api/kintal/board/cards/${encodeURIComponent(cardId)}/move`,
      { method: "POST", body: { status } },
    );
    // Sem revalidatePath aqui — o move é o caminho mais quente (drag & drop)
    // e o client já faz update otimista. Listar de novo no server seria
    // redundante e atrapalha o feedback visual.
    return { ok: true, card: data.card };
  } catch (err) {
    return toCardResult(err);
  }
}

export async function deleteCardAction(
  cardId: string,
): Promise<KanbanVoidActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/board/cards/${encodeURIComponent(cardId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/kintal/board");
    return { ok: true };
  } catch (err) {
    return toVoidResult(err);
  }
}

function toCardResult(err: unknown): KanbanActionResult {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente em alguns segundos.",
  };
}

function toVoidResult(err: unknown): KanbanVoidActionResult {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente em alguns segundos.",
  };
}
