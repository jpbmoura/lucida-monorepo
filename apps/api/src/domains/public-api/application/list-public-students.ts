import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";

interface Input {
  organizationId: string;
  classId: string;
}

interface StudentDto {
  id: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Output {
  data: StudentDto[];
}

/**
 * `GET /v1/public/classes/:id/students` — lista alunos de uma turma da
 * org da chave. Não pagina (ainda) — turmas raramente passam de centenas
 * de alunos. Quando virar gargalo, vira cursor like classes.
 *
 * Valida ownership: a turma precisa pertencer à org da chave (senão 404).
 * Não revela existência de turmas cross-org.
 */
export class ListPublicStudentsByClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || cls.organizationId !== input.organizationId) {
      throw new ClassNotFoundError();
    }
    const items = await this.students.findByClassId(cls.id.toString());
    return {
      data: items.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        matricula: s.matricula,
        email: s.email,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }
}
