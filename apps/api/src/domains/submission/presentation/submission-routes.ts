import { Router, type RequestHandler } from "express";
import type { SubmissionController } from "./submission-controller.js";

// Rotas PÚBLICAS — sem requireAuth. Usadas pelo fluxo do aluno respondendo
// a prova pela URL do shareId.
export function makePublicSubmissionRouter({
  controller,
}: {
  controller: SubmissionController;
}): Router {
  const router = Router();
  router.get("/v1/public/exams/:shareId", controller.getPublicExam);
  router.get(
    "/v1/public/exams/:shareId/resolve-token",
    controller.resolveToken,
  );
  router.post("/v1/public/exams/:shareId/begin", controller.begin);
  router.post(
    "/v1/public/exams/:shareId/begin-by-email",
    controller.beginByEmail,
  );
  router.post(
    "/v1/public/exams/:shareId/begin-from-token",
    controller.beginFromToken,
  );
  router.post("/v1/public/exams/:shareId/submissions", controller.submit);
  return router;
}

// Rotas autenticadas — listagem de submissões pro professor dono da prova.
export function makeAuthedSubmissionRouter({
  requireAuth,
  controller,
}: {
  requireAuth: RequestHandler;
  controller: SubmissionController;
}): Router {
  const router = Router();
  router.get("/v1/exams/:examId/submissions", requireAuth, controller.listByExam);
  return router;
}
