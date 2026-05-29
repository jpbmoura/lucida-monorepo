import type { RequestHandler } from "express";
import {
  archiveLessonPlanBody,
  classIdParam,
  createLessonPlanBody,
  lessonPlanIdParam,
  listLessonPlansQuery,
  updateLessonPlanBody,
} from "./lesson-plan-schemas.js";
import type { CreateLessonPlanUseCase } from "../application/create-lesson-plan.js";
import type { ListLessonPlansByClassUseCase } from "../application/list-lesson-plans-by-class.js";
import type { GetLessonPlanUseCase } from "../application/get-lesson-plan.js";
import type { UpdateLessonPlanUseCase } from "../application/update-lesson-plan.js";
import type { DeleteLessonPlanUseCase } from "../application/delete-lesson-plan.js";
import type { DuplicateLessonPlanUseCase } from "../application/duplicate-lesson-plan.js";
import type { ArchiveLessonPlanUseCase } from "../application/archive-lesson-plan.js";
import type { ExportLessonPlanDocxUseCase } from "../application/export-lesson-plan-docx.js";
import type { LessonPlanIdentification } from "../domain/lesson-plan.js";

interface Deps {
  createLessonPlan: CreateLessonPlanUseCase;
  listLessonPlansByClass: ListLessonPlansByClassUseCase;
  getLessonPlan: GetLessonPlanUseCase;
  updateLessonPlan: UpdateLessonPlanUseCase;
  deleteLessonPlan: DeleteLessonPlanUseCase;
  duplicateLessonPlan: DuplicateLessonPlanUseCase;
  archiveLessonPlan: ArchiveLessonPlanUseCase;
  exportLessonPlanDocx: ExportLessonPlanDocxUseCase;
}

export class LessonPlanController {
  constructor(private readonly deps: Deps) {}

  listByClass: RequestHandler = async (req, res, next) => {
    try {
      const { classId } = classIdParam.parse(req.params);
      const { includeArchived } = listLessonPlansQuery.parse(req.query);
      const items = await this.deps.listLessonPlansByClass.execute({
        classId,
        ownerId: req.auth!.userId,
        includeArchived,
      });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createLessonPlanBody.parse(req.body);
      const identification: LessonPlanIdentification = {
        title: body.identification.title,
        subject: body.identification.subject,
        level: body.identification.level,
        durationMinutes: body.identification.durationMinutes,
        date: body.identification.date ? new Date(body.identification.date) : null,
      };
      const created = await this.deps.createLessonPlan.execute({
        ownerId: req.auth!.userId,
        classId: body.classId,
        segment: body.segment,
        status: body.status,
        identification,
        content: body.content,
        sourceMaterialIds: body.sourceMaterialIds,
        usage: body.usage ?? null,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      const plan = await this.deps.getLessonPlan.execute({
        planId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data: plan });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      const body = updateLessonPlanBody.parse(req.body);
      const identification =
        body.identification === undefined
          ? undefined
          : {
              ...body.identification,
              date:
                body.identification.date === undefined
                  ? undefined
                  : body.identification.date
                    ? new Date(body.identification.date)
                    : null,
            };
      await this.deps.updateLessonPlan.execute({
        planId: id,
        ownerId: req.auth!.userId,
        identification,
        content: body.content,
        status: body.status,
        generatedExamId: body.generatedExamId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  duplicate: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      const created = await this.deps.duplicateLessonPlan.execute({
        planId: id,
        ownerId: req.auth!.userId,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  archive: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      const { archived } = archiveLessonPlanBody.parse(req.body);
      await this.deps.archiveLessonPlan.execute({
        planId: id,
        ownerId: req.auth!.userId,
        archived,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      await this.deps.deleteLessonPlan.execute({
        planId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  exportDocx: RequestHandler = async (req, res, next) => {
    try {
      const { id } = lessonPlanIdParam.parse(req.params);
      const { fileName, buffer } = await this.deps.exportLessonPlanDocx.execute({
        planId: id,
        ownerId: req.auth!.userId,
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.setHeader("Content-Length", String(buffer.length));
      res.end(buffer);
    } catch (err) {
      next(err);
    }
  };
}
