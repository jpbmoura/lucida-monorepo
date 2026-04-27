export const ROADMAP_PRODUCTS = ["exam", "analytics"] as const;
export type RoadmapProduct = (typeof ROADMAP_PRODUCTS)[number];

export const ROADMAP_STAGES = [
  "suggested",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
] as const;
export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

export const ROADMAP_SOURCES = ["community", "staff"] as const;
export type RoadmapSource = (typeof ROADMAP_SOURCES)[number];

export type RoadmapModerationStatus =
  | "auto_approved"
  | "pending"
  | "approved"
  | "rejected";

/** Estágios curados que aparecem no kanban (sem `suggested` e `declined`). */
export const KANBAN_STAGES: readonly RoadmapStage[] = [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
] as const;

/** Estágios em que o staff pode criar um item direto. */
export const STAFF_CREATABLE_STAGES: readonly RoadmapStage[] = [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
] as const;

export interface RoadmapItemDto {
  id: string;
  title: string;
  description: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  source: RoadmapSource;
  votes: number;
  moderationStatus: RoadmapModerationStatus;
  staffNote: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  viewerHasVoted: boolean;
}

export interface ListRoadmapResponse {
  items: RoadmapItemDto[];
}

export const STAGE_LABELS: Record<RoadmapStage, string> = {
  suggested: "Sugestões da comunidade",
  under_review: "Em análise",
  planned: "Planejado",
  in_progress: "Em desenvolvimento",
  shipped: "Lançado",
  declined: "Recusado",
};

export const PRODUCT_LABELS: Record<RoadmapProduct, string> = {
  exam: "Exam",
  analytics: "Analytics",
};

export type RoadmapActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
