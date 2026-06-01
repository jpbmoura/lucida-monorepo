import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import type { ClassroomApiClient } from "./ports/classroom-api-client.js";
import type { EnsureFreshCredentialService } from "./ensure-fresh-credential.js";

interface Input {
  teacherId: string;
  examId: string;
  /** Turma da Lucida (vinculada ao Classroom) onde criar a atividade. */
  classId: string;
}

interface Output {
  courseWorkId: string;
}

/**
 * FASE 2 — Envio da prova pro Google Classroom. ENGATILHADO, NÃO IMPLEMENTADO.
 *
 * Fluxo previsto:
 *   1. Carrega o Exam (precisa ser online) e a Class vinculada (classroomCourseId).
 *   2. Cria UMA atividade: api.createCourseWork(token, { assigneeMode ALL_STUDENTS,
 *      maxPoints, Link material → /exam/{shareId} — link GENÉRICO, não por aluno }).
 *   3. exam.linkToCourseWork(courseWorkId) + salva.
 *
 * INVARIANTE (crítica — ver ExamProps.courseWorkId): o passback de notas da
 * FASE 3 só funciona se a atividade tiver sido criada PELA Lucida. Por isso o
 * courseWorkId é guardado no Exam aqui.
 *
 * As dependências já estão no lugar (credenciais, token fresco, api client com
 * createCourseWork declarado) — abrir a fase 2 é implementar este método sem
 * mexer na fase 1.
 */
export class SendExamToClassroomUseCase {
  constructor(
    private readonly credentials: ClassroomCredentialRepository,
    private readonly ensureFresh: EnsureFreshCredentialService,
    private readonly api: ClassroomApiClient,
    // TODO(fase-2): injetar ExamRepository + ClassRepository quando implementar.
  ) {}

  async execute(_input: Input): Promise<Output> {
    // TODO(fase-2): implementar conforme o fluxo documentado acima.
    void this.credentials;
    void this.ensureFresh;
    void this.api;
    throw new Error("FASE 2 — envio da prova pro Classroom ainda não implementado.");
  }
}
