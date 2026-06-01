import { Class } from "@/domains/class/domain/class.js";
import { ClassCourseInvalidError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { CourseId } from "@/domains/course/domain/course-id.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
import type { CreateCourseUseCase } from "@/domains/course/application/create-course.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import { ClassroomNotConnectedError } from "../domain/classroom-errors.js";
import type { ReconciliationReport } from "../domain/reconciliation-report.js";
import type { ReconcileStudentsUseCase } from "./reconcile-students.js";

interface Input {
  teacherId: string;
  classroomCourseId: string;
  /** Nome da turma Lucida (sugerido a partir do Classroom, editável). */
  className: string;
  /** Curso existente OU novo — exatamente um dos dois. */
  courseId?: string;
  newCourseName?: string;
}

interface Output {
  classId: string;
  courseId: string;
  /** True se a turma já estava vinculada (re-import idempotente). */
  alreadyLinked: boolean;
  report: ReconciliationReport;
}

/**
 * Importa uma turma do Google Classroom como Turma da Lucida. O professor
 * escolhe um Curso existente OU cria um novo aqui (toda Turma precisa de
 * Curso). Vincula `class.classroomCourseId` (idempotência) e reconcilia os
 * alunos por email. Re-importar a mesma turma reaproveita o vínculo.
 */
export class ImportClassroomCourseUseCase {
  constructor(
    private readonly credentials: ClassroomCredentialRepository,
    private readonly courses: CourseRepository,
    private readonly createCourse: CreateCourseUseCase,
    private readonly classes: ClassRepository,
    private readonly reconcile: ReconcileStudentsUseCase,
  ) {}

  async execute(input: Input): Promise<Output> {
    // Falha cedo se não está conectado — evita criar Curso/Turma órfãos.
    const credential = await this.credentials.findByTeacherId(input.teacherId);
    if (!credential) throw new ClassroomNotConnectedError();

    // Idempotência: turma já importada → só reconcilia de novo.
    const existing = await this.classes.findByOwnerAndClassroomCourseId(
      input.teacherId,
      input.classroomCourseId,
    );
    if (existing) {
      const report = await this.reconcile.execute({
        teacherId: input.teacherId,
        classId: existing.id.toString(),
      });
      return {
        classId: existing.id.toString(),
        courseId: existing.courseId,
        alreadyLinked: true,
        report,
      };
    }

    // Resolve o Curso: existente (validando posse) ou cria um novo.
    const courseId = await this.resolveCourseId(input);

    const cls = Class.create({
      id: this.classes.nextId(),
      name: input.className,
      ownerId: input.teacherId,
      courseId,
      classroomCourseId: input.classroomCourseId,
    });
    await this.classes.save(cls);

    const report = await this.reconcile.execute({
      teacherId: input.teacherId,
      classId: cls.id.toString(),
    });

    return {
      classId: cls.id.toString(),
      courseId,
      alreadyLinked: false,
      report,
    };
  }

  private async resolveCourseId(input: Input): Promise<string> {
    if (input.courseId) {
      const course = await this.courses.findById(CourseId.of(input.courseId));
      if (!course || !course.isOwnedBy(input.teacherId)) {
        throw new ClassCourseInvalidError();
      }
      return course.id.toString();
    }

    const created = await this.createCourse.execute({
      name: input.newCourseName ?? input.className,
      ownerId: input.teacherId,
    });
    return created.id;
  }
}
