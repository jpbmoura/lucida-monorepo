import type { Class } from "./class.js";
import type { ClassId } from "./class-id.js";

/**
 * Cursor opaco pra paginação — encoded em base64url. O caller passa
 * adiante sem inspecionar; o repo decoda.
 */
export interface ClassPageCursor {
  /** ISO da `createdAt` do último item da página anterior. */
  createdAt: string;
  /** Id do último item — pra desempate quando duas turmas compartilham o mesmo timestamp. */
  id: string;
}

export interface ClassPage {
  items: Class[];
  /** Cursor pra próxima página, ou null se não há mais resultados. */
  nextCursor: ClassPageCursor | null;
}

export interface ClassRepository {
  nextId(): ClassId;
  save(cls: Class): Promise<void>;
  findById(id: ClassId): Promise<Class | null>;
  findByOwner(ownerId: string): Promise<Class[]>;
  /** Lista turmas do curso. Ordem: createdAt desc. */
  findByCourse(courseId: string): Promise<Class[]>;
  /** Conta turmas no curso. Usado pelo guard de delete em Fase 4. */
  countByCourse(courseId: string): Promise<number>;
  /**
   * Lista turmas da organização, paginada por cursor. Ordenação fixa
   * `createdAt desc, _id desc` (turma mais recente primeiro). Quando
   * `teacherId` é passado, filtra por `ownerId === teacherId`.
   */
  findByOrganizationPaginated(
    organizationId: string,
    options: {
      limit: number;
      cursor?: ClassPageCursor | null;
      teacherId?: string | null;
    },
  ): Promise<ClassPage>;
  delete(id: ClassId): Promise<void>;
}
