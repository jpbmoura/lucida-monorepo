import type { RequestHandler } from "express";
import {
  createExamBody,
  updateExamBody,
  classIdParam,
  examIdParam,
  exportExamQuery,
} from "./exam-schemas.js";
import type { CreateExamUseCase } from "../application/create-exam.js";
import type { ListExamsByClassUseCase } from "../application/list-exams-by-class.js";
import type { GetExamUseCase } from "../application/get-exam.js";
import type { UpdateExamUseCase } from "../application/update-exam.js";
import type { DeleteExamUseCase } from "../application/delete-exam.js";
import type { ExportExamDocxUseCase } from "../application/export-exam-docx.js";

interface Deps {
  createExam: CreateExamUseCase;
  listExamsByClass: ListExamsByClassUseCase;
  getExam: GetExamUseCase;
  updateExam: UpdateExamUseCase;
  deleteExam: DeleteExamUseCase;
  exportExamDocx: ExportExamDocxUseCase;
}

export class ExamController {
  constructor(private readonly deps: Deps) {}

  listByClass: RequestHandler = async (req, res, next) => {
    try {
      const { classId } = classIdParam.parse(req.params);
      const items = await this.deps.listExamsByClass.execute({
        classId,
        ownerId: req.auth!.userId,
      });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createExamBody.parse(req.body);
      const created = await this.deps.createExam.execute({
        ownerId: req.auth!.userId,
        classId: body.classId,
        title: body.title,
        description: body.description,
        style: body.style,
        duration: body.duration,
        securityLevel: body.securityLevel,
        questions: body.questions,
        usage: body.usage ?? null,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const exam = await this.deps.getExam.execute({
        examId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data: exam });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const body = updateExamBody.parse(req.body);
      await this.deps.updateExam.execute({
        examId: id,
        ownerId: req.auth!.userId,
        title: body.title,
        description: body.description,
        duration: body.duration,
        securityLevel: body.securityLevel,
        questions: body.questions,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      await this.deps.deleteExam.execute({
        examId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  exportDocx: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const { version } = exportExamQuery.parse(req.query);
      const { fileName, buffer } = await this.deps.exportExamDocx.execute({
        examId: id,
        ownerId: req.auth!.userId,
        version,
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
