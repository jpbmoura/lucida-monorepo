import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import type { ClassroomApiClient } from "./ports/classroom-api-client.js";
import type { EnsureFreshCredentialService } from "./ensure-fresh-credential.js";

interface Input {
  teacherId: string;
  /** Submissão finalizada e corrigida (objetiva) da Lucida. */
  submissionId: string;
}

/**
 * FASE 3 — Passback da nota pro Google Classroom. ENGATILHADO, NÃO IMPLEMENTADO.
 *
 * Fluxo previsto (escrita com a credencial do PROFESSOR):
 *   1. Carrega a Submission corrigida → Exam (precisa ter courseWorkId — ver
 *      invariante) → Class vinculada (classroomCourseId).
 *   2. api.listStudentSubmissions(token, classroomCourseId, courseWorkId).
 *   3. Casa a submissão Lucida com a do Classroom pela identidade do roster
 *      (student.classroomUserId — casamento garantido porque a FASE 3 troca a
 *      entrada por email livre por seleção de nome a partir do roster importado).
 *   4. Lança a nota em DOIS PASSOS: api.patchGrade (draftGrade) e depois
 *      assignedGrade.
 *
 * Pré-requisito: escopos de escrita no Classroom (classroom.coursework.students)
 * — listados como "futuros" no doc de GCP.
 */
export class PushGradeToClassroomUseCase {
  constructor(
    private readonly credentials: ClassroomCredentialRepository,
    private readonly ensureFresh: EnsureFreshCredentialService,
    private readonly api: ClassroomApiClient,
    // TODO(fase-3): injetar SubmissionRepository + ExamRepository + StudentRepository.
  ) {}

  async execute(_input: Input): Promise<void> {
    // TODO(fase-3): implementar conforme o fluxo documentado acima.
    void this.credentials;
    void this.ensureFresh;
    void this.api;
    throw new Error("FASE 3 — passback de nota pro Classroom ainda não implementado.");
  }
}
