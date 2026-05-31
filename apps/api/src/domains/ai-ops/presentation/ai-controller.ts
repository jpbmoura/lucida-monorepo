import type { RequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "@/shared/errors/domain-error.js";
import { startSseStream } from "@/shared/http/sse.js";
import {
  estimateExamConfigSchema,
  estimateOpenConfigSchema,
  generateExamConfigSchema,
  generateOpenConfigSchema,
  gradingTargetSchema,
  regenerateOpenConfigSchema,
  regenerateQuestionConfigSchema,
} from "./ai-schemas.js";
import type { GenerateExamQuestionsUseCase } from "../application/generate-exam-questions.js";
import type { RegenerateQuestionUseCase } from "../application/regenerate-question.js";
import type { EstimateExamGenerationUseCase } from "../application/estimate-exam-generation.js";
import type { GenerateOpenQuestionsUseCase } from "../application/generate-open-questions.js";
import type { EstimateOpenGenerationUseCase } from "../application/estimate-open-generation.js";
import type { RegenerateOpenQuestionUseCase } from "../application/regenerate-open-question.js";
import type { EstimateGradingUseCase } from "../application/estimate-grading.js";
import type { GradeOpenAnswersUseCase } from "../application/grade-open-answers.js";

// Intervalo entre pings do generate-exam. O Fastly default é
// `between_bytes_timeout: 10s` — 8s dá margem.
const SSE_HEARTBEAT_MS = 8_000;

interface Deps {
  generateExamQuestions: GenerateExamQuestionsUseCase;
  regenerateQuestion: RegenerateQuestionUseCase;
  estimateExamGeneration: EstimateExamGenerationUseCase;
  generateOpenQuestions: GenerateOpenQuestionsUseCase;
  estimateOpenGeneration: EstimateOpenGenerationUseCase;
  regenerateOpenQuestion: RegenerateOpenQuestionUseCase;
  estimateGrading: EstimateGradingUseCase;
  gradeOpenAnswers: GradeOpenAnswersUseCase;
}

export class AiController {
  constructor(private readonly deps: Deps) {}

  // Resposta via SSE. A geração demora 30s–2min e proxies intermediários
  // (Fastly/Railway edge) cortam por idle timeout; o stream com heartbeat
  // mantém a conexão viva. Validação de payload acontece antes do upgrade
  // pra SSE — erros de input ainda voltam como JSON 4xx normal pro
  // cliente conseguir mostrar a mensagem.
  generateExam: RequestHandler = async (req, res) => {
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
    let config;
    try {
      config = generateExamConfigSchema.parse(parsed);
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
      const result = await this.deps.generateExamQuestions.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          style: config.style,
          questionTypes: config.questionTypes,
          language: config.language,
        },
        files: files.map((f) => ({
          filename: f.originalname,
          mimetype: f.mimetype,
          buffer: f.buffer,
        })),
        pastedText: config.pastedText ?? "",
        youtubeUrls: config.youtubeUrls ?? [],
        onProgress: (p) => stream.send("progress", p),
      });
      stream.send("result", { data: result });
    } catch (err) {
      // Como já fizemos o switch pra SSE, a resposta de erro também vai
      // por aqui — o errorHandler global não consegue mais ajudar.
      // Replico o shape dele (status + code + message) num event: error.
      if (err instanceof DomainError) {
        stream.send("error", {
          status: err.statusCode,
          code: err.code,
          message: err.message,
        });
      } else {
        const e = err as Error;
        console.error("[ai-ops] unhandled error in generateExam SSE", {
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

      // Preço tabelado depende só de style + questionCount — não extrai
      // material nem chama OpenAI.
      const result = await this.deps.estimateExamGeneration.execute({
        config: {
          style: config.style,
          questionCount: config.questionCount,
        },
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // Geração de prova DISCURSIVA por IA — SSE (mesmo padrão do generate-exam).
  generateOpenExam: RequestHandler = async (req, res) => {
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
    let config;
    try {
      config = generateOpenConfigSchema.parse(parsed);
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
      const result = await this.deps.generateOpenQuestions.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          style: config.style,
          language: config.language,
        },
        files: files.map((f) => ({
          filename: f.originalname,
          mimetype: f.mimetype,
          buffer: f.buffer,
        })),
        pastedText: config.pastedText ?? "",
        youtubeUrls: config.youtubeUrls ?? [],
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
        console.error("[ai-ops] unhandled error in generateOpenExam SSE", {
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

  estimateOpenExam: RequestHandler = async (req, res, next) => {
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
      const config = estimateOpenConfigSchema.parse(parsed);
      const result = await this.deps.estimateOpenGeneration.execute({
        questionCount: config.questionCount,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  regenerateOpenQuestion: RequestHandler = async (req, res, next) => {
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
      const config = regenerateOpenConfigSchema.parse(parsed);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const result = await this.deps.regenerateOpenQuestion.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        config: {
          questionCount: 1,
          difficulty: config.difficulty,
          style: config.style,
          language: config.language,
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

  // Cotação da correção por IA — JSON instantâneo, sem débito. Soma o preço
  // por resposta contra as respostas já no banco.
  estimateGrading: RequestHandler = async (req, res, next) => {
    try {
      const body = gradingTargetSchema.parse(req.body);
      const result = await this.deps.estimateGrading.execute({
        examId: body.examId,
        ownerId: req.auth!.userId,
        submissionIds: body.submissionIds,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // Roda a correção por IA via SSE (pode demorar — N alunos). Emite progress
  // por submissão e o resultado no fim. Mesma blindagem de erro do generate.
  gradeOpenAnswers: RequestHandler = async (req, res) => {
    let body;
    try {
      body = gradingTargetSchema.parse(req.body);
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

    const stream = startSseStream(res);
    const heartbeat = setInterval(() => {
      stream.send("ping", { ts: Date.now() });
    }, SSE_HEARTBEAT_MS);

    try {
      const result = await this.deps.gradeOpenAnswers.execute({
        ownerId: req.auth!.userId,
        activeOrganizationId: req.auth!.activeOrganizationId,
        actorRealUserId: req.auth!.realUserId,
        examId: body.examId,
        submissionIds: body.submissionIds,
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
        console.error("[ai-ops] unhandled error in gradeOpenAnswers SSE", {
          name: e?.name,
          message: e?.message,
          stack: e?.stack,
        });
        stream.send("error", {
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Erro inesperado durante a correção.",
        });
      }
    } finally {
      clearInterval(heartbeat);
      stream.end();
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
          language: config.language,
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
