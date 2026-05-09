import { Class } from "@/domains/class/domain/class.js";
import { ClassCourseInvalidError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { Course } from "@/domains/course/domain/course.js";
import { CourseId } from "@/domains/course/domain/course-id.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
import type { OrganizationMembersRepository } from "@/domains/analytics/application/ports/organization-members-repository.js";
import { DomainError } from "@/shared/errors/domain-error.js";

class TeacherNotInOrgError extends DomainError {
  readonly code = "TEACHER_NOT_IN_ORG";
  readonly statusCode = 422;
  constructor() {
    super(
      "teacherId existe mas não é member da organização dessa chave de API.",
    );
  }
}

const DEFAULT_COURSE_NAME = "Geral";
const DEFAULT_COURSE_DESCRIPTION =
  "Curso padrão criado automaticamente. Renomeie ou crie outros cursos para organizar suas turmas.";

interface Input {
  organizationId: string;
  name: string;
  description?: string;
  subject?: string | null;
  grade?: string | null;
  teacherId: string;
  /**
   * Quando ausente, a turma vai pro curso "Geral" do `teacherId`
   * (resolvido/criado on-demand) — retrocompat com clientes que
   * existiam antes da camada Curso.
   */
  courseId?: string | null;
}

interface Output {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  grade: string | null;
  teacherId: string;
  courseId: string;
  studentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `POST /v1/public/classes` — cria turma vinculada à org da chave.
 * Valida via OrgMembersRepository que o `teacherId` é member da mesma
 * organização (caso contrário 422).
 *
 * Resolução do curso:
 *   - `courseId` presente → valida que pertence ao `teacherId`.
 *   - `courseId` ausente → reusa/cria o curso "Geral" do `teacherId`.
 */
export class CreatePublicClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly courses: CourseRepository,
    private readonly orgMembers: OrganizationMembersRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const role = await this.orgMembers.findRole(
      input.organizationId,
      input.teacherId,
    );
    if (role === null) {
      throw new TeacherNotInOrgError();
    }

    const courseId = input.courseId
      ? await this.resolveExplicitCourse(input.courseId, input.teacherId)
      : await this.resolveDefaultCourse(input.teacherId, input.organizationId);

    const cls = Class.create({
      id: this.classes.nextId(),
      name: input.name,
      description: input.description,
      subject: input.subject ?? null,
      grade: input.grade ?? null,
      ownerId: input.teacherId,
      organizationId: input.organizationId,
      courseId,
    });
    await this.classes.save(cls);

    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description.length > 0 ? cls.description : null,
      subject: cls.subject,
      grade: cls.grade,
      teacherId: cls.ownerId,
      courseId: cls.courseId,
      studentsCount: 0,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    };
  }

  private async resolveExplicitCourse(
    courseId: string,
    teacherId: string,
  ): Promise<string> {
    const course = await this.courses.findById(CourseId.of(courseId));
    if (!course || !course.isOwnedBy(teacherId)) {
      throw new ClassCourseInvalidError();
    }
    return course.id.toString();
  }

  private async resolveDefaultCourse(
    teacherId: string,
    organizationId: string,
  ): Promise<string> {
    const owned = await this.courses.findByOwner(teacherId);
    const existing = owned.find((c) => c.name === DEFAULT_COURSE_NAME);
    if (existing) return existing.id.toString();

    const course = Course.create({
      id: this.courses.nextId(),
      name: DEFAULT_COURSE_NAME,
      description: DEFAULT_COURSE_DESCRIPTION,
      ownerId: teacherId,
      organizationId,
    });
    await this.courses.save(course);
    return course.id.toString();
  }
}
