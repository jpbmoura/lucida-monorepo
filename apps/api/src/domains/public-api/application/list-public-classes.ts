import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import { decodeCursor, encodeCursor } from "./cursor.js";

interface Input {
  organizationId: string;
  cursor?: string;
  limit: number;
  teacherId?: string | null;
}

interface ClassDto {
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

interface Output {
  data: ClassDto[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface CursorPayload {
  createdAt: string;
  id: string;
}

/**
 * `GET /v1/public/classes` — paginado por cursor opaco. Retorna turmas
 * vinculadas à org da chave; `teacherId` filtra por professor.
 *
 * `studentsCount` é resolvido lendo `students.countByClassId` por turma
 * — ok pra páginas até 100 (10 paralelas + tempo de Mongo). Se virar
 * gargalo, troca por aggregation `$lookup`.
 */
export class ListPublicClassesUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const cursor = decodeCursor<CursorPayload>(input.cursor);
    const page = await this.classes.findByOrganizationPaginated(
      input.organizationId,
      {
        limit: input.limit,
        cursor,
        teacherId: input.teacherId ?? null,
      },
    );

    const counts = await Promise.all(
      page.items.map((c) => this.students.countByClassId(c.id.toString())),
    );

    const data: ClassDto[] = page.items.map((c, i) => ({
      id: c.id.toString(),
      name: c.name,
      description: c.description.length > 0 ? c.description : null,
      subject: c.subject,
      grade: c.grade,
      teacherId: c.ownerId,
      studentsCount: counts[i] ?? 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      data,
      pageInfo: {
        nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
        hasMore: page.nextCursor !== null,
      },
    };
  }
}
