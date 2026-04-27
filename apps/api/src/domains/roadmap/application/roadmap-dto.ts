import type {
  RoadmapModerationStatus,
  RoadmapProduct,
  RoadmapSource,
  RoadmapStage,
} from "../domain/roadmap-types.js";

/**
 * Shape que sai dos use cases pra o controller. O controller não conhece
 * a entidade rica do domain — sempre lida com este DTO. `createdBy*` só
 * são populados quando `viewerRole === "staff"` na listagem pública.
 */
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
  createdAt: Date;
  updatedAt: Date;
  /** True quando o viewer (autenticado) já votou nesse item. */
  viewerHasVoted: boolean;
}
