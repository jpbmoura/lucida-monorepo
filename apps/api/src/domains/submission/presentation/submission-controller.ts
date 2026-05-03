import type { RequestHandler } from "express";
import {
  beginExamBody,
  beginExamByEmailBody,
  beginExamFromTokenBody,
  examIdParam,
  shareIdParam,
  submitExamBody,
} from "./submission-schemas.js";
import type { GetPublicExamUseCase } from "../application/get-public-exam.js";
import type { BeginExamUseCase } from "../application/begin-exam.js";
import type { BeginExamByEmailUseCase } from "../application/begin-exam-by-email.js";
import type { BeginExamFromTokenUseCase } from "../application/begin-exam-from-token.js";
import type { ResolveExamLinkTokenUseCase } from "../application/resolve-exam-link-token.js";
import type { SubmitExamUseCase } from "../application/submit-exam.js";
import type { ListSubmissionsByExamUseCase } from "../application/list-submissions-by-exam.js";

interface Deps {
  getPublicExam: GetPublicExamUseCase;
  beginExam: BeginExamUseCase;
  beginExamByEmail: BeginExamByEmailUseCase;
  beginExamFromToken: BeginExamFromTokenUseCase;
  resolveExamLinkToken: ResolveExamLinkTokenUseCase;
  submitExam: SubmitExamUseCase;
  listSubmissionsByExam: ListSubmissionsByExamUseCase;
  /**
   * Secret usado pra verificar a assinatura do token. Vem do
   * `AUTH_SECRET` do api — controller é instanciado pelo composition
   * root que sabe disso.
   */
  authSecret: string;
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

  beginByEmail: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const body = beginExamByEmailBody.parse(req.body);
      const data = await this.deps.beginExamByEmail.execute({
        shareId,
        email: body.email,
        name: body.name,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  resolveToken: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const data = await this.deps.resolveExamLinkToken.execute({
        shareId,
        token,
        authSecret: this.deps.authSecret,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  beginFromToken: RequestHandler = async (req, res, next) => {
    try {
      const { shareId } = shareIdParam.parse(req.params);
      const body = beginExamFromTokenBody.parse(req.body);
      const data = await this.deps.beginExamFromToken.execute({
        shareId,
        token: body.token,
        authSecret: this.deps.authSecret,
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
