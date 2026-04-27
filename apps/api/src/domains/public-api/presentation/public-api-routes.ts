import { Router, type RequestHandler } from "express";
import { makeRequireScope } from "@/domains/api-access/presentation/middleware/require-scope.js";
import type { PublicClassesController } from "./public-classes-controller.js";
import type { PublicStudentsController } from "./public-students-controller.js";
import type { PublicExamsController } from "./public-exams-controller.js";

interface MakePublicApiRouterDeps {
  /** Bearer middleware — decora `req.apiKey`. */
  requireApiKey: RequestHandler;
  classesController: PublicClassesController;
  studentsController: PublicStudentsController;
  examsController: PublicExamsController;
}

/**
 * Router das rotas `/v1/public/*`. Toda rota encadeia
 * `requireApiKey + requireScope(...)`. A factory `makeRequireScope` é
 * inlinada por rota — assim é trivial bater o olho e ver qual escopo
 * cada endpoint exige.
 */
export function makePublicApiRouter({
  requireApiKey,
  classesController,
  studentsController,
  examsController,
}: MakePublicApiRouterDeps): Router {
  const router = Router();

  router.get(
    "/v1/public/classes",
    requireApiKey,
    makeRequireScope("classes:read"),
    classesController.list,
  );
  router.post(
    "/v1/public/classes",
    requireApiKey,
    makeRequireScope("classes:write"),
    classesController.create,
  );

  router.get(
    "/v1/public/classes/:id/students",
    requireApiKey,
    makeRequireScope("students:read"),
    studentsController.listByClass,
  );
  router.post(
    "/v1/public/classes/:id/students",
    requireApiKey,
    makeRequireScope("students:write"),
    studentsController.createBatch,
  );

  router.post(
    "/v1/public/exams/:id/share-link",
    requireApiKey,
    makeRequireScope("exams:share"),
    examsController.issueShareLink,
  );
  router.get(
    "/v1/public/exams/:id/results",
    requireApiKey,
    makeRequireScope("exams:read"),
    examsController.results,
  );

  return router;
}
