import { Router, type RequestHandler } from "express";
import multer from "multer";
import type { AiController } from "./ai-controller.js";
import type { LessonPlanAiController } from "./lesson-plan-ai-controller.js";
import type { SlideDeckAiController } from "./slide-deck-ai-controller.js";

// Memory storage — sem temp files, buffers vivem só durante a request.
// Limite de 25 MB por arquivo, até 10 arquivos simultâneos.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
  },
});

export function makeAiRouter({
  requireAuth,
  controller,
  lessonPlanController,
  slideDeckController,
}: {
  requireAuth: RequestHandler;
  controller: AiController;
  lessonPlanController: LessonPlanAiController;
  slideDeckController: SlideDeckAiController;
}): Router {
  const router = Router();
  router.post(
    "/v1/ai/generate-exam",
    requireAuth,
    upload.array("files"),
    controller.generateExam,
  );
  router.post(
    "/v1/ai/regenerate-question",
    requireAuth,
    upload.array("files"),
    controller.regenerateQuestion,
  );
  // Devolve o custo exato (preço tabelado por style + questionCount). Mesmo
  // valor que o generate vai debitar. Sem extração de material, sem OpenAI,
  // sem débito. multer só parseia o campo `config` do form-data.
  router.post(
    "/v1/ai/estimate",
    requireAuth,
    upload.array("files"),
    controller.estimateExam,
  );

  // --- Geração de prova DISCURSIVA por IA (form-data com material) ---
  router.post(
    "/v1/ai/generate-open-exam",
    requireAuth,
    upload.array("files"),
    controller.generateOpenExam,
  );
  router.post(
    "/v1/ai/estimate-open",
    requireAuth,
    upload.array("files"),
    controller.estimateOpenExam,
  );
  router.post(
    "/v1/ai/regenerate-open-question",
    requireAuth,
    upload.array("files"),
    controller.regenerateOpenQuestion,
  );

  // --- Correção de discursivas por IA (body JSON, sem arquivos) ---
  router.post("/v1/ai/grading/estimate", requireAuth, controller.estimateGrading);
  router.post("/v1/ai/grading/run", requireAuth, controller.gradeOpenAnswers);

  // --- Planos de aula (módulo "Aulas") ---
  router.post(
    "/v1/ai/generate-lesson-plan",
    requireAuth,
    upload.array("files"),
    lessonPlanController.generateLessonPlan,
  );
  router.post(
    "/v1/ai/regenerate-lesson-block",
    requireAuth,
    upload.array("files"),
    lessonPlanController.regenerateLessonBlock,
  );
  router.post(
    "/v1/ai/estimate-lesson-plan",
    requireAuth,
    upload.array("files"),
    lessonPlanController.estimateLessonPlan,
  );

  // --- Apresentações / slides (módulo "Apresentações") ---
  router.post(
    "/v1/ai/generate-deck",
    requireAuth,
    upload.array("files"),
    slideDeckController.generateDeck,
  );
  router.post(
    "/v1/ai/regenerate-slide",
    requireAuth,
    upload.array("files"),
    slideDeckController.regenerateSlide,
  );
  router.post(
    "/v1/ai/estimate-deck",
    requireAuth,
    upload.array("files"),
    slideDeckController.estimateDeck,
  );
  router.get("/v1/ai/images", requireAuth, slideDeckController.searchImages);
  return router;
}
