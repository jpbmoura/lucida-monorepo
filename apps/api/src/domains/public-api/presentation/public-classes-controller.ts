import type { RequestHandler } from "express";
import type { ListPublicClassesUseCase } from "../application/list-public-classes.js";
import type { CreatePublicClassUseCase } from "../application/create-public-class.js";
import { createClassBody, listClassesQuery } from "./public-schemas.js";

interface Deps {
  listClasses: ListPublicClassesUseCase;
  createClass: CreatePublicClassUseCase;
}

export class PublicClassesController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listClassesQuery.parse(req.query);
      const result = await this.deps.listClasses.execute({
        organizationId: req.apiKey!.organizationId,
        cursor: query.cursor,
        limit: query.limit,
        teacherId: query.teacherId ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createClassBody.parse(req.body);
      const result = await this.deps.createClass.execute({
        organizationId: req.apiKey!.organizationId,
        name: body.name,
        description: body.description,
        subject: body.subject ?? null,
        grade: body.grade ?? null,
        teacherId: body.teacherId,
        courseId: body.courseId ?? null,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
