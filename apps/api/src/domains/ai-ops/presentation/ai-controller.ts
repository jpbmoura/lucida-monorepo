import type { RequestHandler } from "express";
import {
  estimateExamConfigSchema,
  generateExamConfigSchema,
  regenerateQuestionConfigSchema,
} from "./ai-schemas.js";
import type { GenerateExamQuestionsUseCase } from "../application/generate-exam-questions.js";
import type { RegenerateQuestionUseCase } from "../application/regenerate-question.js";
import type { EstimateExamGenerationUseCase } from "../application/estimate-exam-generation.js";

interface Deps {
  generateExamQuestions: GenerateExamQuestionsUseCase;
  regenerateQuestion: RegenerateQuestionUseCase;
  estimateExamGeneration: EstimateExamGenerationUseCase;
}

export class AiController {
  constructor(private readonly deps: Deps) {}

  generateExam: RequestHandler = async (req, res, next) => {
    try {
      const raw = req.body?.config;
      if (!raw || typeof raw !== "string") {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' ausente no form-data.",
        });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' não é JSON válido.",
        });
        return;
      }
      const config = generateExamConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const result = await this.deps.generateExamQuestions.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
        },
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

  estimateExam: RequestHandler = async (req, res, next) => {
    try {
      const raw = req.body?.config;
      if (!raw || typeof raw !== "string") {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' ausente no form-data.",
        });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' não é JSON válido.",
        });
        return;
      }
      const config = estimateExamConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const result = await this.deps.estimateExamGeneration.execute({
        config: {
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
        },
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

  regenerateQuestion: RequestHandler = async (req, res, next) => {
    try {
      const raw = req.body?.config;
      if (!raw || typeof raw !== "string") {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' ausente no form-data.",
        });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Campo 'config' não é JSON válido.",
        });
        return;
      }
      const config = regenerateQuestionConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const result = await this.deps.regenerateQuestion.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
        },
        files: files.map((f) => ({
          filename: f.originalname,
          mimetype: f.mimetype,
          buffer: f.buffer,
        })),
        pastedText: config.pastedText ?? "",
        youtubeUrls: config.youtubeUrls ?? [],
        avoidStatements: config.avoidStatements,
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
