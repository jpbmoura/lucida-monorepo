import type { RequestHandler } from "express";
import type { ListPublicStudentsByClassUseCase } from "../application/list-public-students.js";
import type { CreatePublicStudentsBatchUseCase } from "../application/create-public-students-batch.js";
import {
  classIdParam,
  createStudentsBatchBody,
} from "./public-schemas.js";

interface Deps {
  listStudents: ListPublicStudentsByClassUseCase;
  createStudentsBatch: CreatePublicStudentsBatchUseCase;
}

export class PublicStudentsController {
  constructor(private readonly deps: Deps) {}

  listByClass: RequestHandler = async (req, res, next) => {
    try {
      const { id: classId } = classIdParam.parse(req.params);
      const result = await this.deps.listStudents.execute({
        organizationId: req.apiKey!.organizationId,
        classId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  createBatch: RequestHandler = async (req, res, next) => {
    try {
      const { id: classId } = classIdParam.parse(req.params);
      const body = createStudentsBatchBody.parse(req.body);
      const result = await this.deps.createStudentsBatch.execute({
        organizationId: req.apiKey!.organizationId,
        classId,
        students: body.students.map((s) => ({
          name: s.name,
          matricula: s.matricula,
          email: s.email ?? null,
        })),
      });
      // 207 Multi-Status — convenção pra batches com sucesso parcial.
      // Cliente inspeciona `results[].status` por item.
      res.status(207).json(result);
    } catch (err) {
      next(err);
    }
  };
}
