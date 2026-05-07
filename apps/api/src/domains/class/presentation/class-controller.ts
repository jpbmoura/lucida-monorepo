import type { RequestHandler } from "express";
import {
  createClassBody,
  updateClassBody,
  classIdParam,
} from "./class-schemas.js";
import type { CreateClassUseCase } from "../application/create-class.js";
import type { ListClassesUseCase } from "../application/list-classes.js";
import type { GetClassUseCase } from "../application/get-class.js";
import type { UpdateClassUseCase } from "../application/update-class.js";
import type { DeleteClassUseCase } from "../application/delete-class.js";

interface Deps {
  createClass: CreateClassUseCase;
  listClasses: ListClassesUseCase;
  getClass: GetClassUseCase;
  updateClass: UpdateClassUseCase;
  deleteClass: DeleteClassUseCase;
}

export class ClassController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const items = await this.deps.listClasses.execute({ ownerId: req.auth!.userId });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createClassBody.parse(req.body);
      const created = await this.deps.createClass.execute({
        ownerId: req.auth!.userId,
        name: body.name,
        description: body.description,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      const { id } = classIdParam.parse(req.params);
      const result = await this.deps.getClass.execute({
        classId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = classIdParam.parse(req.params);
      const body = updateClassBody.parse(req.body);
      await this.deps.updateClass.execute({
        classId: id,
        ownerId: req.auth!.userId,
        name: body.name,
        description: body.description,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = classIdParam.parse(req.params);
      await this.deps.deleteClass.execute({
        classId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
