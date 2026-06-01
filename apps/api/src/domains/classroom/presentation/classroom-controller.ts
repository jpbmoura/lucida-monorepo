import type { RequestHandler } from "express";
import { env } from "@/env.js";
import {
  importCourseBody,
  classroomCourseIdParam,
  classIdParam,
  oauthCallbackQuery,
} from "./classroom-schemas.js";
import type { GetConnectionStatusUseCase } from "../application/get-connection-status.js";
import type { BuildAuthorizeUrlUseCase } from "../application/build-authorize-url.js";
import type { CompleteOAuthUseCase } from "../application/complete-oauth.js";
import type { DisconnectClassroomUseCase } from "../application/disconnect-classroom.js";
import type { ListClassroomCoursesUseCase } from "../application/list-classroom-courses.js";
import type { ImportClassroomCourseUseCase } from "../application/import-classroom-course.js";
import type { ReconcileStudentsUseCase } from "../application/reconcile-students.js";

interface Deps {
  getStatus: GetConnectionStatusUseCase;
  buildAuthorizeUrl: BuildAuthorizeUrlUseCase;
  completeOAuth: CompleteOAuthUseCase;
  disconnect: DisconnectClassroomUseCase;
  listCourses: ListClassroomCoursesUseCase;
  importCourse: ImportClassroomCourseUseCase;
  reconcile: ReconcileStudentsUseCase;
}

export class ClassroomController {
  constructor(private readonly deps: Deps) {}

  status: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.getStatus.execute({
        teacherId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  authorizeUrl: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.buildAuthorizeUrl.execute({
        teacherId: req.auth!.userId,
        organizationId: req.auth!.activeOrganizationId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  disconnect: RequestHandler = async (req, res, next) => {
    try {
      await this.deps.disconnect.execute({ teacherId: req.auth!.userId });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  listCourses: RequestHandler = async (req, res, next) => {
    try {
      const items = await this.deps.listCourses.execute({
        teacherId: req.auth!.userId,
      });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  importCourse: RequestHandler = async (req, res, next) => {
    try {
      const { classroomCourseId } = classroomCourseIdParam.parse(req.params);
      const body = importCourseBody.parse(req.body);
      const result = await this.deps.importCourse.execute({
        teacherId: req.auth!.userId,
        classroomCourseId,
        className: body.className,
        courseId: body.courseId,
        newCourseName: body.newCourseName,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  reconcile: RequestHandler = async (req, res, next) => {
    try {
      const { classId } = classIdParam.parse(req.params);
      const report = await this.deps.reconcile.execute({
        teacherId: req.auth!.userId,
        classId,
      });
      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Callback público do OAuth (Google → API). NÃO passa por requireAuth — a
   * identidade vem do `state` assinado. Sempre faz REDIRECT pro web (nunca
   * devolve JSON) pra fechar o popup/aba do consentimento numa página da app.
   */
  oauthCallback: RequestHandler = async (req, res) => {
    const base = `${env.WEB_ORIGIN}/app/integracoes`;
    try {
      const query = oauthCallbackQuery.parse(req.query);
      if (query.error || !query.code || !query.state) {
        res.redirect(`${base}?classroom=error`);
        return;
      }
      await this.deps.completeOAuth.execute({
        state: query.state,
        code: query.code,
      });
      res.redirect(`${base}?classroom=connected`);
    } catch {
      // Qualquer falha (state inválido, troca de code, etc.) → volta com erro.
      res.redirect(`${base}?classroom=error`);
    }
  };
}
