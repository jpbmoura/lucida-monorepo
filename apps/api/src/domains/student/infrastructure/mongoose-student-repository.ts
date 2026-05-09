import { randomUUID } from "node:crypto";
import { Student } from "../domain/student.js";
import { StudentId } from "../domain/student-id.js";
import { StudentCode } from "../domain/student-code.js";
import type { StudentRepository } from "../domain/student-repository.js";
import { StudentModel, type StudentDoc } from "./student-schema.js";

export class MongooseStudentRepository implements StudentRepository {
  nextId(): StudentId {
    return StudentId.of(randomUUID());
  }

  async save(student: Student): Promise<void> {
    await StudentModel.updateOne(
      { _id: student.id.toString() },
      {
        $set: {
          classId: student.classId,
          ownerId: student.ownerId,
          organizationId: student.organizationId,
          courseId: student.courseId,
          code: student.code.toString(),
          name: student.name,
          matricula: student.matricula,
          email: student.email,
        },
        $setOnInsert: {
          _id: student.id.toString(),
          createdAt: student.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findById(id: StudentId): Promise<Student | null> {
    const doc = await StudentModel.findById(id.toString()).lean<StudentDoc>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByClassId(classId: string): Promise<Student[]> {
    const docs = await StudentModel.find({ classId })
      .sort({ name: 1 })
      .lean<StudentDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async countByClassId(classId: string): Promise<number> {
    return StudentModel.countDocuments({ classId }).exec();
  }

  async countByCourseId(courseId: string): Promise<number> {
    return StudentModel.countDocuments({ courseId }).exec();
  }

  async updateCourseForClass(
    classId: string,
    newCourseId: string | null,
  ): Promise<void> {
    await StudentModel.updateMany(
      { classId },
      { $set: { courseId: newCourseId } },
    ).exec();
  }

  async delete(id: StudentId): Promise<void> {
    await StudentModel.deleteOne({ _id: id.toString() }).exec();
  }

  async deleteByClassId(classId: string): Promise<void> {
    await StudentModel.deleteMany({ classId }).exec();
  }

  async existsByClassAndCode(classId: string, code: StudentCode): Promise<boolean> {
    const doc = await StudentModel.exists({ classId, code: code.toString() }).exec();
    return doc !== null;
  }

  async existsByOwnerAndMatricula(ownerId: string, matricula: string): Promise<boolean> {
    const doc = await StudentModel.exists({ ownerId, matricula }).exec();
    return doc !== null;
  }

  async existsByOwnerAndMatriculaExcluding(
    ownerId: string,
    matricula: string,
    excludeId: StudentId,
  ): Promise<boolean> {
    const doc = await StudentModel.exists({
      ownerId,
      matricula,
      _id: { $ne: excludeId.toString() },
    }).exec();
    return doc !== null;
  }

  async existsByOrganizationAndMatricula(
    organizationId: string,
    matricula: string,
  ): Promise<boolean> {
    const doc = await StudentModel.exists({
      organizationId,
      matricula,
    }).exec();
    return doc !== null;
  }

  async existsByOrganizationAndMatriculaExcluding(
    organizationId: string,
    matricula: string,
    excludeId: StudentId,
  ): Promise<boolean> {
    const doc = await StudentModel.exists({
      organizationId,
      matricula,
      _id: { $ne: excludeId.toString() },
    }).exec();
    return doc !== null;
  }

  async findByOrganizationAndMatricula(
    organizationId: string,
    matricula: string,
  ): Promise<Student | null> {
    const doc = await StudentModel.findOne({ organizationId, matricula })
      .lean<StudentDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwnerAndMatricula(
    ownerId: string,
    matricula: string,
  ): Promise<Student | null> {
    const doc = await StudentModel.findOne({ ownerId, matricula })
      .lean<StudentDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByClassIdAndEmail(
    classId: string,
    email: string,
  ): Promise<Student | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    const doc = await StudentModel.findOne({ classId, email: normalized })
      .lean<StudentDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }
}

function toEntity(doc: StudentDoc): Student {
  return Student.restore({
    id: StudentId.of(doc._id),
    classId: doc.classId,
    ownerId: doc.ownerId,
    organizationId: doc.organizationId ?? null,
    // Pós-backfill (Fase 3+) courseId é sempre string. Fallback "" só
    // pra atravessar leitura — save subsequente vai estourar pelo `required`.
    courseId: doc.courseId ?? "",
    code: StudentCode.of(doc.code),
    name: doc.name,
    matricula: doc.matricula,
    email: doc.email ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
