import mongoose, { Schema, type Model } from "mongoose";

export interface RoadmapVoteDoc {
  _id: string;
  itemId: string;
  userId: string;
  createdAt: Date;
}

const roadmapVoteSchema = new Schema<RoadmapVoteDoc>(
  {
    _id: { type: String, required: true },
    itemId: { type: String, required: true },
    userId: { type: String, required: true },
  },
  {
    collection: "roadmap_votes",
    timestamps: { createdAt: true, updatedAt: false },
    _id: false,
    versionKey: false,
  },
);

// Unique de verdade — barreira anti-double-vote. (itemId, userId).
roadmapVoteSchema.index({ itemId: 1, userId: 1 }, { unique: true });
// Lookup quente: dado um user, em quais itens ele já votou.
roadmapVoteSchema.index({ userId: 1, itemId: 1 });

export const RoadmapVoteModel: Model<RoadmapVoteDoc> =
  (mongoose.models.RoadmapVote as Model<RoadmapVoteDoc> | undefined) ??
  mongoose.model<RoadmapVoteDoc>("RoadmapVote", roadmapVoteSchema);
