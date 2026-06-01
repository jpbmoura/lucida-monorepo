import { randomUUID } from "node:crypto";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import { Student } from "@/domains/student/domain/student.js";
import { StudentCode } from "@/domains/student/domain/student-code.js";
import { StudentCodeExhaustedError } from "@/domains/student/domain/student-errors.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import {
  ClassroomCourseNotFoundError,
  ClassroomNotConnectedError,
} from "../domain/classroom-errors.js";
import {
  emptyReconciliationReport,
  type ReconciliationReport,
} from "../domain/reconciliation-report.js";
import type { ClassroomApiClient } from "./ports/classroom-api-client.js";
import type { EnsureFreshCredentialService } from "./ensure-fresh-credential.js";

interface Input {
  teacherId: string;
  /** Turma da Lucida (precisa estar vinculada ao Classroom). */
  classId: string;
}

const MAX_CODE_ATTEMPTS = 10;

/**
 * Reconciliação por E-MAIL entre o roster do Google Classroom e os alunos da
 * turma Lucida. Reusada pelo import inicial e pelo botão "Importar alunos do
 * Classroom". A primeira importação é só o caso "todo mundo é novo" — mesma
 * lógica:
 *   • email não existe → cria
 *   • email existe      → não duplica; atualiza nome se mudou; vincula o
 *                         classroomUserId; restaura se estava marcado como saído
 *   • aluno saiu do roster → SINALIZA (classroomRemovedAt), nunca apaga
 *
 * Idempotente: o índice único {classId,email} + o vínculo garantem que rodar
 * de novo não duplica.
 */
export class ReconcileStudentsUseCase {
  constructor(
    private readonly credentials: ClassroomCredentialRepository,
    private readonly ensureFresh: EnsureFreshCredentialService,
    private readonly api: ClassroomApiClient,
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(input: Input): Promise<ReconciliationReport> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.teacherId)) {
      throw new ClassNotFoundError();
    }
    if (!cls.classroomCourseId) {
      // Turma não veio do Classroom — nada a reconciliar.
      throw new ClassroomCourseNotFoundError();
    }

    const credential = await this.credentials.findByTeacherId(input.teacherId);
    if (!credential) throw new ClassroomNotConnectedError();
    const fresh = await this.ensureFresh.execute(credential);

    const roster = await this.api.listStudents(
      fresh.accessToken,
      cls.classroomCourseId,
    );

    const report = emptyReconciliationReport();
    const now = new Date();
    const seenClassroomUserIds = new Set<string>();

    for (const rosterStudent of roster) {
      if (!rosterStudent.email) {
        report.skippedNoEmail += 1;
        continue;
      }
      seenClassroomUserIds.add(rosterStudent.classroomUserId);

      const existing = await this.students.findByClassIdAndEmail(
        input.classId,
        rosterStudent.email,
      );

      if (!existing) {
        const code = await this.generateUniqueCode(input.classId);
        const student = Student.create({
          id: this.students.nextId(),
          classId: input.classId,
          ownerId: input.teacherId,
          organizationId: cls.organizationId,
          courseId: cls.courseId,
          code,
          name: rosterStudent.name,
          matricula: `gcr-${randomUUID().slice(0, 12)}`,
          email: rosterStudent.email,
          classroomUserId: rosterStudent.classroomUserId,
          now,
        });
        await this.students.save(student);
        report.imported += 1;
        continue;
      }

      // Já existe (mesmo email) — atualiza sem duplicar.
      if (existing.name !== rosterStudent.name) {
        existing.rename(rosterStudent.name, now);
      }
      if (existing.classroomUserId !== rosterStudent.classroomUserId) {
        existing.linkClassroomUser(rosterStudent.classroomUserId, now);
      } else {
        existing.restoreFromClassroom(now);
      }
      await this.students.save(existing);
      report.alreadyExisted += 1;
    }

    // Detecta saídas: alunos vinculados ao Classroom que sumiram do roster.
    const localStudents = await this.students.findByClassId(input.classId);
    for (const student of localStudents) {
      const cid = student.classroomUserId;
      if (!cid) continue; // aluno cadastrado à mão pelo professor — não conta
      if (seenClassroomUserIds.has(cid)) continue; // ainda no roster
      if (student.classroomRemovedAt) continue; // já marcado
      student.markDepartedFromClassroom(now);
      await this.students.save(student);
      report.departed += 1;
    }

    return report;
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
