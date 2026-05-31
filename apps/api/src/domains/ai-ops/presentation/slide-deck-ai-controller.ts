import type { RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { DomainError } from "@/shared/errors/domain-error.js";
import { startSseStream } from "@/shared/http/sse.js";
import { LessonPlanId } from "@/domains/lesson-plan/domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "@/domains/lesson-plan/domain/lesson-plan-errors.js";
import type { LessonPlanRepository } from "@/domains/lesson-plan/domain/lesson-plan-repository.js";
import type { ImageProvider } from "../domain/image-provider.js";
import type { SourceFile } from "../domain/generation-types.js";
import type {
  SlideDeckGenerationConfig,
  SlideSourceType,
} from "../domain/slide-generation-types.js";
import type { GenerateDeckUseCase } from "../application/generate-deck.js";
import type { RegenerateSlideUseCase } from "../application/regenerate-slide.js";
import type { EstimateDeckCreditsUseCase } from "../application/estimate-deck-credits.js";
import {
  estimateDeckConfigSchema,
  generateDeckConfigSchema,
  regenerateSlideConfigSchema,
  type GenerateDeckConfigInput,
} from "./slide-deck-ai-schemas.js";
import { renderLessonPlanAsText } from "./render-lesson-plan-source.js";

const SSE_HEARTBEAT_MS = 8_000;

interface Deps {
  generateDeck: GenerateDeckUseCase;
  regenerateSlide: RegenerateSlideUseCase;
  estimateDeckCredits: EstimateDeckCreditsUseCase;
  lessonPlans: LessonPlanRepository;
  imageProvider: ImageProvider;
}

function parseConfigField(raw: unknown, res: Response): unknown | null {
  if (!raw || typeof raw !== "string") {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Campo 'config' ausente no form-data.",
    });
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Campo 'config' não é JSON válido.",
    });
    return null;
  }
}

function toGenerationConfig(
  config: GenerateDeckConfigInput,
): SlideDeckGenerationConfig {
  return {
    source: config.source as SlideSourceType,
    title: config.title,
    subject: config.subject,
    gradeLevel: config.gradeLevel,
    tone: config.tone,
    slideCount: config.slideCount,
    includeNotes: config.includeNotes,
    includeActivity: config.includeActivity,
    language: config.language,
  };
}

interface ResolvedSource {
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

export class SlideDeckAiController {
  constructor(private readonly deps: Deps) {}

  // Resolve a fonte do material. Plano de aula → carrega a entidade (dono) e
  // renderiza pra texto. Material cru → usa arquivos/texto/vídeo do form-data.
  private async resolveSource(
    config: { source: string; lessonPlanId?: string; pastedText?: string; youtubeUrls?: string[] },
    files: Express.Multer.File[],
    ownerId: string,
  ): Promise<ResolvedSource> {
    if (config.source === "lesson-plan") {
      const plan = await this.deps.lessonPlans.findById(
        LessonPlanId.of(config.lessonPlanId!),
      );
      if (!plan || !plan.isOwnedBy(ownerId)) {
        throw new LessonPlanNotFoundError();
      }
      return {
        files: [],
        pastedText: renderLessonPlanAsText(plan),
        youtubeUrls: [],
      };
    }
    return {
      files: files.map((f) => ({
        filename: f.originalname,
        mimetype: f.mimetype,
        buffer: f.buffer,
      })),
      pastedText: config.pastedText ?? "",
      youtubeUrls: config.youtubeUrls ?? [],
    };
  }

  // SSE — geração transmite slide-a-slide (event "progress" por slide), depois
  // "result" com o deck completo. Mesmo padrão do generateLessonPlan/Exam.
  generateDeck: RequestHandler = async (req, res) => {
    const parsed = parseConfigField(req.body?.config, res);
    if (parsed === null) return;

    let config: GenerateDeckConfigInput;
    try {
      config = generateDeckConfigSchema.parse(parsed);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          issues: err.flatten(),
        });
        return;
      }
      throw err;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const stream = startSseStream(res);
    const heartbeat = setInterval(() => {
      stream.send("ping", { ts: Date.now() });
    }, SSE_HEARTBEAT_MS);

    try {
      const source = await this.resolveSource(
        config,
        files,
        req.auth!.userId,
      );
      const result = await this.deps.generateDeck.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: toGenerationConfig(config),
        files: source.files,
        pastedText: source.pastedText,
        youtubeUrls: source.youtubeUrls,
        onProgress: (p) => stream.send("progress", p),
      });
      stream.send("result", { data: result });
    } catch (err) {
      if (err instanceof DomainError) {
        stream.send("error", {
          status: err.statusCode,
          code: err.code,
          message: err.message,
        });
      } else {
        const e = err as Error;
        console.error("[ai-ops] unhandled error in generateDeck SSE", {
          name: e?.name,
          message: e?.message,
          stack: e?.stack,
        });
        stream.send("error", {
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Erro inesperado durante a geração.",
        });
      }
    } finally {
      clearInterval(heartbeat);
      stream.end();
    }
  };

  // Busca imagens (Pexels) pro editor trocar a imagem de um slide. GET simples;
  // sem provedor configurado devolve [] (degradação graciosa).
  searchImages: RequestHandler = async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) {
        res.json({ data: [] });
        return;
      }
      const results = await this.deps.imageProvider.search(q, {
        orientation: "landscape",
        perPage: 12,
      });
      res.json({ data: results });
    } catch (err) {
      next(err);
    }
  };

  estimateDeck: RequestHandler = async (req, res, next) => {
    try {
      const parsed = parseConfigField(req.body?.config, res);
      if (parsed === null) return;
      const config = estimateDeckConfigSchema.parse(parsed);
      const result = await this.deps.estimateDeckCredits.execute({
        config: { source: config.source, slideCount: config.slideCount },
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // HTTP simples (resposta rápida — um slide só).
  regenerateSlide: RequestHandler = async (req, res, next) => {
    try {
      const parsed = parseConfigField(req.body?.config, res);
      if (parsed === null) return;
      const config = regenerateSlideConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const source = await this.resolveSource(config, files, req.auth!.userId);
      const result = await this.deps.regenerateSlide.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: toGenerationConfig(config),
        currentSlides: config.currentSlides,
        slideId: config.slideId,
        files: source.files,
        pastedText: source.pastedText,
        youtubeUrls: source.youtubeUrls,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
