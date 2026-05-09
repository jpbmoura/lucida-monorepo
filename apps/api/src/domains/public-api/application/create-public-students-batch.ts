import { Student } from "@/domains/student/domain/student.js";
import { StudentCode } from "@/domains/student/domain/student-code.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { GetOrganizationPreferencesUseCase } from "@/domains/organization-preferences/application/get-organization-preferences.js";

interface BatchItemInput {
  name: string;
  matricula: string;
  email?: string | null;
}

interface Input {
  organizationId: string;
  classId: string;
  students: BatchItemInput[];
}

/**
 * Resultado por item — espelha o array de input na mesma ordem. O
 * controller serializa como `207 Multi-Status` no response. `error.code`
 * é estável pra cliente decidir reaction (ex.: ignorar duplicatas).
 */
export type BatchItemResult =
  | {
      status: "created";
      matricula: string;
      studentId: string;
      code: string;
    }
  | {
      status: "duplicate";
      matricula: string;
      /** Id do aluno preexistente — útil pra cliente "matar" o link de SIS. */
      existingStudentId: string;
    }
  | {
      status: "error";
      matricula: string;
      error: { code: string; message: string };
    };

interface Output {
  results: BatchItemResult[];
  /** Resumo agregado pra logs/auditoria do cliente. */
  summary: {
    created: number;
    duplicate: number;
    error: number;
  };
}

const MAX_CODE_ATTEMPTS = 10;
class StudentCodeExhaustedError extends DomainError {
  readonly code = "CODE_EXHAUSTED";
  readonly statusCode = 500;
  constructor() {
    super("Não foi possível gerar código único após várias tentativas.");
  }
}

/**
 * `POST /v1/public/classes/:id/students` — cadastra múltiplos alunos
 * numa turma. Comportamento por item:
 *
 *   - matrícula nova → cria, retorna `created`
 *   - matrícula já existente no scope (org ou teacher, conforme prefs)
 *     → retorna `duplicate` com `existingStudentId`. Não atualiza dados.
 *   - validação falhou → retorna `error` com code/message
 *
 * Por que NÃO upsert: cliente pode estar fazendo onboarding inicial e
 * não esperaria a Lucida mexer em alunos preexistentes silenciosamente.
 * Atualizações vão por endpoints dedicados (próxima fase).
 */
export class CreatePublicStudentsBatchUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly orgPrefs: GetOrganizationPreferencesUseCase,
  ) {}

  async execute(input: Input): Promise<Output> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || cls.organizationId !== input.organizationId) {
      throw new ClassNotFoundError();
    }

    const prefs = await this.orgPrefs.execute({
      organizationId: input.organizationId,
    });

    const results: BatchItemResult[] = [];
    const seenMatriculas = new Set<string>();

    for (const item of input.students) {
      const matricula = item.matricula.trim();

      // Dedup intra-batch — duas linhas com a mesma matrícula no mesmo
      // POST ficam ambas como duplicate (após a primeira ser created).
      if (seenMatriculas.has(matricula)) {
        const existing = await this.findExisting(
          input.organizationId,
          cls.ownerId,
          matricula,
          prefs.matriculaScope,
        );
        results.push({
          status: "duplicate",
          matricula,
          existingStudentId: existing?.id.toString() ?? "",
        });
        continue;
      }
      seenMatriculas.add(matricula);

      // Dedup inter-batch — checa se já existe no scope correto.
      const existing = await this.findExisting(
        input.organizationId,
        cls.ownerId,
        matricula,
        prefs.matriculaScope,
      );
      if (existing) {
        results.push({
          status: "duplicate",
          matricula,
          existingStudentId: existing.id.toString(),
        });
        continue;
      }

      try {
        const code = await this.generateUniqueCode(cls.id.toString());
        const student = Student.create({
          id: this.students.nextId(),
          classId: cls.id.toString(),
          ownerId: cls.ownerId,
          organizationId: input.organizationId,
          courseId: cls.courseId,
          code,
          name: item.name,
          matricula,
          email: item.email ?? null,
        });
        await this.students.save(student);
        results.push({
          status: "created",
          matricula,
          studentId: student.id.toString(),
          code: student.code.toString(),
        });
      } catch (err) {
        if (err instanceof DomainError) {
          results.push({
            status: "error",
            matricula,
            error: { code: err.code, message: err.message },
          });
          continue;
        }
        // Race em unique index (matrícula criada concorrentemente). Se
        // mongo levantar duplicate key (11000), reporta como duplicate.
        if (isDuplicateKey(err)) {
          const existingNow = await this.findExisting(
            input.organizationId,
            cls.ownerId,
            matricula,
            prefs.matriculaScope,
          );
          results.push({
            status: "duplicate",
            matricula,
            existingStudentId: existingNow?.id.toString() ?? "",
          });
          continue;
        }
        throw err;
      }
    }

    return {
      results,
      summary: {
        created: results.filter((r) => r.status === "created").length,
        duplicate: results.filter((r) => r.status === "duplicate").length,
        error: results.filter((r) => r.status === "error").length,
      },
    };
  }

  private async findExisting(
    organizationId: string,
    ownerId: string,
    matricula: string,
    scope: "teacher" | "organization",
  ): Promise<{ id: { toString(): string } } | null> {
    if (scope === "organization") {
      return this.students.findByOrganizationAndMatricula(
        organizationId,
        matricula,
      );
    }
    return this.students.findByOwnerAndMatricula(ownerId, matricula);
  }

  private async generateUniqueCode(classId: string): Promise<StudentCode> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = StudentCode.generate();
      const clash = await this.students.existsByClassAndCode(classId, candidate);
      if (!clash) return candidate;
    }
    throw new StudentCodeExhaustedError();
  }
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
