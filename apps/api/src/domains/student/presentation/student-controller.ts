import type { RequestHandler } from "express";
import {
  createStudentBody,
  updateStudentBody,
  classIdParam,
  studentIdParam,
} from "./student-schemas.js";
import type { CreateStudentUseCase } from "../application/create-student.js";
import type { ListStudentsByClassUseCase } from "../application/list-students-by-class.js";
import type { UpdateStudentUseCase } from "../application/update-student.js";
import type { DeleteStudentUseCase } from "../application/delete-student.js";

interface Deps {
  createStudent: CreateStudentUseCase;
  listStudentsByClass: ListStudentsByClassUseCase;
  updateStudent: UpdateStudentUseCase;
  deleteStudent: DeleteStudentUseCase;
}

export class StudentController {
  constructor(private readonly deps: Deps) {}

  listByClass: RequestHandler = async (req, res, next) => {
    try {
      const { classId } = classIdParam.parse(req.params);
      const items = await this.deps.listStudentsByClass.execute({
        classId,
        ownerId: req.auth!.userId,
      });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  createInClass: RequestHandler = async (req, res, next) => {
    try {
      const { classId } = classIdParam.parse(req.params);
      const body = createStudentBody.parse(req.body);
      const created = await this.deps.createStudent.execute({
        classId,
        ownerId: req.auth!.userId,
        name: body.name,
        matricula: body.matricula,
        email: body.email,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = studentIdParam.parse(req.params);
      const body = updateStudentBody.parse(req.body);
      await this.deps.updateStudent.execute({
        studentId: id,
        ownerId: req.auth!.userId,
        name: body.name,
        matricula: body.matricula,
        email: body.email,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = studentIdParam.parse(req.params);
      await this.deps.deleteStudent.execute({
        studentId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
