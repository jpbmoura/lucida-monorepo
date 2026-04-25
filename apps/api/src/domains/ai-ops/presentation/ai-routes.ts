import { Router, type RequestHandler } from "express";
import multer from "multer";
import type { AiController } from "./ai-controller.js";

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
}: {
  requireAuth: RequestHandler;
  controller: AiController;
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
  return router;
}
