"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  ListRoadmapResponse,
  RoadmapActionResult,
  RoadmapProduct,
  RoadmapStage,
  RoadmapItemDto,
} from "./types";

export async function fetchRoadmap(filter?: {
  product?: RoadmapProduct;
}): Promise<RoadmapItemDto[]> {
  const qs = filter?.product ? `?product=${filter.product}` : "";
  const data = await apiFetch<ListRoadmapResponse>(`/api/roadmap${qs}`);
  return data.items;
}

export async function suggestFeatureAction(input: {
  title: string;
  description?: string;
  product: RoadmapProduct;
}): Promise<RoadmapActionResult> {
  try {
    await apiFetch<{ id: string }>("/api/roadmap/suggestions", {
      method: "POST",
      body: input,
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function voteOnItemAction(
  itemId: string,
): Promise<RoadmapActionResult> {
  try {
    await apiFetch<void>(`/api/roadmap/${encodeURIComponent(itemId)}/vote`, {
      method: "POST",
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function unvoteItemAction(
  itemId: string,
): Promise<RoadmapActionResult> {
  try {
    await apiFetch<void>(`/api/roadmap/${encodeURIComponent(itemId)}/vote`, {
      method: "DELETE",
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function createRoadmapItemAction(input: {
  title: string;
  description?: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  staffNote?: string | null;
}): Promise<RoadmapActionResult> {
  try {
    await apiFetch<{ id: string }>("/api/roadmap", {
      method: "POST",
      body: input,
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function updateRoadmapItemAction(
  itemId: string,
  input: {
    title?: string;
    description?: string;
    product?: RoadmapProduct;
    stage?: RoadmapStage;
    staffNote?: string | null;
  },
): Promise<RoadmapActionResult> {
  try {
    await apiFetch<void>(`/api/roadmap/${encodeURIComponent(itemId)}`, {
      method: "PUT",
      body: input,
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteRoadmapItemAction(
  itemId: string,
): Promise<RoadmapActionResult> {
  try {
    await apiFetch<void>(`/api/roadmap/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

function toResult(err: unknown): RoadmapActionResult {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente de novo em alguns segundos.",
  };
}
