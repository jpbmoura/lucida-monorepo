import mongoose, { Schema, type Model } from "mongoose";
import {
  ROADMAP_MODERATION_STATUSES,
  ROADMAP_PRODUCTS,
  ROADMAP_SOURCES,
  ROADMAP_STAGES,
  type RoadmapModerationStatus,
  type RoadmapProduct,
  type RoadmapSource,
  type RoadmapStage,
} from "../domain/roadmap-types.js";

export interface RoadmapItemDoc {
  _id: string;
  title: string;
  description: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  source: RoadmapSource;
  votes: number;
  moderationStatus: RoadmapModerationStatus;
  createdBy: string | null;
  staffNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const roadmapItemSchema = new Schema<RoadmapItemDoc>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    product: { type: String, required: true, enum: ROADMAP_PRODUCTS },
    stage: { type: String, required: true, enum: ROADMAP_STAGES },
    source: { type: String, required: true, enum: ROADMAP_SOURCES },
    votes: { type: Number, default: 0, min: 0 },
    moderationStatus: {
      type: String,
      required: true,
      enum: ROADMAP_MODERATION_STATUSES,
      default: "auto_approved",
    },
    createdBy: { type: String, default: null },
    staffNote: { type: String, default: null },
  },
  {
    collection: "roadmap_items",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Listagem pública: filtra por moderation, ordena por estágio (no use case)
// e por votos dentro de `suggested`. Indexar por (moderationStatus, votes)
// cobre as duas leituras quentes; um secundário em (stage, votes) permite
// segmentar por coluna sem scan.
roadmapItemSchema.index({ moderationStatus: 1, stage: 1 });
roadmapItemSchema.index({ stage: 1, votes: -1 });
roadmapItemSchema.index({ product: 1 });

export const RoadmapItemModel: Model<RoadmapItemDoc> =
  (mongoose.models.RoadmapItem as Model<RoadmapItemDoc> | undefined) ??
  mongoose.model<RoadmapItemDoc>("RoadmapItem", roadmapItemSchema);
