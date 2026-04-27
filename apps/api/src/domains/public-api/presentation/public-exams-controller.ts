import type { RequestHandler } from "express";
import type { IssueExamLinkUseCase } from "../application/issue-exam-link.js";
import type { GetPublicExamResultsUseCase } from "../application/get-public-exam-results.js";
import { issueExamLinkBody, examIdParam } from "./public-schemas.js";

interface Deps {
  issueExamLink: IssueExamLinkUseCase;
  getResults: GetPublicExamResultsUseCase;
  /**
   * Origem do app pra montar a URL do link. Vem de `WEB_ORIGIN` env do
   * api — controller só repassa.
   */
  webOrigin: string;
  authSecret: string;
}

export class PublicExamsController {
  constructor(private readonly deps: Deps) {}

  issueShareLink: RequestHandler = async (req, res, next) => {
    try {
      const { id: examId } = examIdParam.parse(req.params);
      const body = issueExamLinkBody.parse(req.body);
      const result = await this.deps.issueExamLink.execute({
        organizationId: req.apiKey!.organizationId,
        examId,
        matricula: body.matricula,
        webOrigin: this.deps.webOrigin,
        authSecret: this.deps.authSecret,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  results: RequestHandler = async (req, res, next) => {
    try {
      const { id: examId } = examIdParam.parse(req.params);
      const result = await this.deps.getResults.execute({
        organizationId: req.apiKey!.organizationId,
        examId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
