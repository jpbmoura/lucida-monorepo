import type { RequestHandler } from "express";
import {
  beginExamBody,
  examIdParam,
  shareIdParam,
  submitExamBody,
} from "./submission-schemas.js";
import type { GetPublicExamUseCase } from "../application/get-public-exam.js";
import type { BeginExamUseCase } from "../application/begin-exam.js";
import type { SubmitExamUseCase } from "../application/submit-exam.js";
import type { ListSubmissionsByExamUseCase } from "../application/list-submissions-by-exam.js";

interface Deps {
  getPublicExam: GetPublicExamUseCase;
  beginExam: BeginExamUseCase;
  submitExam: SubmitExamUseCase;
  listSubmissionsByExam: ListSubmissionsByExamUseCase;
}

export class SubmissionController {
  constructor(private readonly deps: Deps) {}

  // ----- público -----

  getPublicExam: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const data = await this.deps.getPublicExam.execute({ shareId });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  begin: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const body = beginExamBody.parse(req.body);
      const data = await this.deps.beginExam.execute({
        shareId,
        studentCode: body.studentCode,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  submit: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const body = submitExamBody.parse(req.body);
      const data = await this.deps.submitExam.execute({
        shareId,
        submissionId: body.submissionId,
        answers: body.answers,
        endReason: body.endReason,
        integrityFlags: body.integrityFlags,
      });
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // ----- autenticado (professor) -----

  listByExam: RequestHandler = async (req, res, next) => {
    try {
      const { examId } = examIdParam.parse(req.params);
      const data = await this.deps.listSubmissionsByExam.execute({
        examId,
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}
