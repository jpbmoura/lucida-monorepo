import { Class } from "@/domains/class/domain/class.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
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

interface Input {
  organizationId: string;
  name: string;
  description?: string;
  subject?: string | null;
  grade?: string | null;
  teacherId: string;
}

interface Output {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  grade: string | null;
  teacherId: string;
  studentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `POST /v1/public/classes` — cria turma vinculada à org da chave.
 * Valida via OrgMembersRepository que o `teacherId` é member da mesma
 * organização (caso contrário 422).
 */
export class CreatePublicClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
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

    const cls = Class.create({
      id: this.classes.nextId(),
      name: input.name,
      description: input.description,
      subject: input.subject ?? null,
      grade: input.grade ?? null,
      ownerId: input.teacherId,
      organizationId: input.organizationId,
    });
    await this.classes.save(cls);

    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description.length > 0 ? cls.description : null,
      subject: cls.subject,
      grade: cls.grade,
      teacherId: cls.ownerId,
      studentsCount: 0,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    };
  }
}
