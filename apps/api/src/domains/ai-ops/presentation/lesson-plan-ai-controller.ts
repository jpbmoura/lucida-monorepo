import type { RequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "@/shared/errors/domain-error.js";
import { startSseStream } from "@/shared/http/sse.js";
import {
  estimateLessonPlanConfigSchema,
  generateLessonPlanConfigSchema,
  regenerateLessonBlockConfigSchema,
} from "./lesson-plan-ai-schemas.js";
import type { GenerateLessonPlanUseCase } from "../application/generate-lesson-plan.js";
import type { RegenerateLessonBlockUseCase } from "../application/regenerate-lesson-block.js";
import type { EstimateLessonPlanUseCase } from "../application/estimate-lesson-plan.js";

const SSE_HEARTBEAT_MS = 8_000;

interface Deps {
  generateLessonPlan: GenerateLessonPlanUseCase;
  regenerateLessonBlock: RegenerateLessonBlockUseCase;
  estimateLessonPlan: EstimateLessonPlanUseCase;
}

// Lê o campo `config` (JSON em string) do form-data multipart. Comum aos 3
// endpoints. Devolve null + responde 400 se faltar/inválido.
function parseConfigField(raw: unknown, res: Parameters<RequestHandler>[1]): unknown | null {
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

export class LessonPlanAiController {
  constructor(private readonly deps: Deps) {}

  // SSE — geração pode levar dezenas de segundos; heartbeat mantém o proxy
  // vivo. Mesmo padrão do generateExam.
  generateLessonPlan: RequestHandler = async (req, res) => {
    const parsed = parseConfigField(req.body?.config, res);
    if (parsed === null) return;

    let config;
    try {
      config = generateLessonPlanConfigSchema.parse(parsed);
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
      const result = await this.deps.generateLessonPlan.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          segment: config.segment,
          title: config.title,
          subject: config.subject,
          level: config.level,
          durationMinutes: config.durationMinutes,
          language: config.language,
        },
        files: files.map((f) => ({
          filename: f.originalname,
          mimetype: f.mimetype,
          buffer: f.buffer,
        })),
        pastedText: config.pastedText ?? "",
        youtubeUrls: config.youtubeUrls ?? [],
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
        console.error("[ai-ops] unhandled error in generateLessonPlan SSE", {
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

  estimateLessonPlan: RequestHandler = async (req, res, next) => {
    try {
      const parsed = parseConfigField(req.body?.config, res);
      if (parsed === null) return;
      const config = estimateLessonPlanConfigSchema.parse(parsed);
      const result = await this.deps.estimateLessonPlan.execute({
        config: { segment: config.segment },
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // HTTP simples (resposta rápida — só um bloco).
  regenerateLessonBlock: RequestHandler = async (req, res, next) => {
    try {
      const parsed = parseConfigField(req.body?.config, res);
      if (parsed === null) return;
      const config = regenerateLessonBlockConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const result = await this.deps.regenerateLessonBlock.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          segment: config.segment,
          title: config.title,
          subject: config.subject,
          level: config.level,
          durationMinutes: config.durationMinutes,
          language: config.language,
        },
        currentPlan: config.currentPlan,
        blockKey: config.blockKey,
        files: files.map((f) => ({
          filename: f.originalname,
          mimetype: f.mimetype,
          buffer: f.buffer,
        })),
        pastedText: config.pastedText ?? "",
        youtubeUrls: config.youtubeUrls ?? [],
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
