import type { RequestHandler } from "express";
import {
  createCourseBody,
  updateCourseBody,
  courseIdParam,
} from "./course-schemas.js";
import type { CreateCourseUseCase } from "../application/create-course.js";
import type { ListCoursesUseCase } from "../application/list-courses.js";
import type { GetCourseUseCase } from "../application/get-course.js";
import type { UpdateCourseUseCase } from "../application/update-course.js";
import type { DeleteCourseUseCase } from "../application/delete-course.js";

interface Deps {
  createCourse: CreateCourseUseCase;
  listCourses: ListCoursesUseCase;
  getCourse: GetCourseUseCase;
  updateCourse: UpdateCourseUseCase;
  deleteCourse: DeleteCourseUseCase;
}

export class CourseController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const items = await this.deps.listCourses.execute({ ownerId: req.auth!.userId });
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createCourseBody.parse(req.body);
      const created = await this.deps.createCourse.execute({
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
      const { id } = courseIdParam.parse(req.params);
      const result = await this.deps.getCourse.execute({
        courseId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = courseIdParam.parse(req.params);
      const body = updateCourseBody.parse(req.body);
      await this.deps.updateCourse.execute({
        courseId: id,
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
      const { id } = courseIdParam.parse(req.params);
      await this.deps.deleteCourse.execute({
        courseId: id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
