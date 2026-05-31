import mongoose, { Schema, type Model } from "mongoose";
import type {
  Slide,
  SlideBlock,
  SlideColumn,
  SlideImage,
} from "../domain/slide.js";
import type {
  SlideDeckSource,
  SlideDeckStatus,
  SlideTheme,
  SlideTone,
} from "../domain/slide-deck.js";

export interface SlideImageDoc extends SlideImage {}
export interface SlideDoc {
  id: string;
  type: Slide["type"];
  title: string;
  subtitle: string | null;
  blocks: SlideBlock[];
  columns: SlideColumn[];
  image: SlideImageDoc | null;
  notes: string | null;
  bnccCodes: string[];
}

export interface SlideDeckUsageDoc {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface SlideDeckDoc {
  _id: string;
  ownerId: string;
  organizationId: string | null;
  courseId: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: SlideDoc[];
  status: SlideDeckStatus;
  usage: SlideDeckUsageDoc | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<SlideImageDoc>(
  {
    query: { type: String, default: "" },
    required: { type: Boolean, default: false },
    alt: { type: String, default: "" },
    url: { type: String, default: null },
    thumbUrl: { type: String, default: null },
    photographer: { type: String, default: null },
    photographerUrl: { type: String, default: null },
    sourceUrl: { type: String, default: null },
  },
  { _id: false },
);

// blocks/columns são polimórficos (union por kind) — guardamos como Mixed e
// validamos a forma com Zod na presentation. O save substitui a lista inteira
// de slides ($set), então o Mongoose não precisa rastrear mutação profunda.
// Sem generic no subschema: os campos Mixed não casam com a union tipada do
// SlideDoc, mas a leitura é tipada via `.lean<SlideDeckDoc>()` no repositório.
const slideSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, default: "" },
    subtitle: { type: String, default: null },
    blocks: { type: [Schema.Types.Mixed], default: [] },
    columns: { type: [Schema.Types.Mixed], default: [] },
    image: { type: imageSchema, default: null },
    notes: { type: String, default: null },
    bnccCodes: { type: [String], default: [] },
  },
  { _id: false },
);

const sourceSchema = new Schema<SlideDeckSource>(
  {
    type: { type: String, required: true, enum: ["lesson-plan", "material"] },
    ref: { type: String, default: null },
  },
  { _id: false },
);

const usageSchema = new Schema<SlideDeckUsageDoc>(
  {
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    credits: { type: Number, required: true },
  },
  { _id: false },
);

const slideDeckSchema = new Schema<SlideDeckDoc>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    courseId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, default: "" },
    gradeLevel: { type: String, default: "" },
    tone: {
      type: String,
      required: true,
      enum: ["didatico", "descontraido", "formal", "inspirador"],
    },
    theme: {
      type: String,
      required: true,
      enum: ["papel", "minimo", "lousa", "ludico", "vivido"],
    },
    source: { type: sourceSchema, required: true },
    slides: { type: [slideSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "READY", "ERROR"],
      default: "READY",
    },
    usage: { type: usageSchema, default: null },
  },
  {
    collection: "slidedecks",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

slideDeckSchema.index({ ownerId: 1, createdAt: -1 });
slideDeckSchema.index({ organizationId: 1, createdAt: -1, _id: -1 });
slideDeckSchema.index({ courseId: 1, createdAt: -1 });

export const SlideDeckModel: Model<SlideDeckDoc> =
  (mongoose.models.SlideDeck as Model<SlideDeckDoc> | undefined) ??
  mongoose.model<SlideDeckDoc>("SlideDeck", slideDeckSchema);
