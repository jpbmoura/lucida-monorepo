import { createHmac, randomUUID } from "node:crypto";
import type { Submission } from "@/domains/submission/domain/submission.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { WebhookEndpointRepository } from "@/domains/api-access/domain/webhook-endpoint-repository.js";
import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { StudentId } from "@/domains/student/domain/student-id.js";
import type { WebhookEventSender } from "./ports/webhook-event-sender.js";
import type { TeacherInfoLookup } from "./ports/teacher-info-lookup.js";

const MAX_SCORE = 10;
const SIGNATURE_HEADER = "X-Lucida-Signature";
const ALLOWED_END_REASONS = new Set([
  "submitted",
  "time_expired",
  "violation",
] as const);

interface CompletedPayload {
  submissionId: string;
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  matricula: string;
  score: number;
  maxScore: number;
  correctCount: number;
  questionCount: number;
  submittedAt: string;
  endReason: "submitted" | "time_expired" | "violation";
}

interface Envelope {
  id: string;
  event: "submission.completed";
  environment: "live";
  organizationId: string;
  createdAt: string;
  data: CompletedPayload;
}

/**
 * Dispatcher do evento `submission.completed`. Chamado pelos use cases
 * que finalizam uma submissão (`SubmitExamUseCase`).
 *
 * Comportamento:
 *   - Busca metadata (exam, class, student, teacher) — single round
 *     paralelo, todos os repos consultados via Promise.all.
 *   - Filtra endpoints da org da prova que escutam `submission.completed`
 *     e estão `enabled` no environment `live`.
 *   - Pra cada endpoint: monta envelope + assina HMAC + POST com timeout.
 *   - Sem retry persistente nessa fase (MVP) — falhas são logadas em
 *     stderr, nada vai pra fila. Retries com backoff entram em iteração
 *     futura junto com a UI de delivery log no painel de developers.
 *
 * Fire-and-forget: o caller chama `dispatch(submission)` mas não dá await
 * — não queremos atrasar a resposta ao aluno por conta de um endpoint
 * lento de terceiro.
 */
export class DispatchSubmissionCompletedUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly endpoints: WebhookEndpointRepository,
    private readonly teachers: TeacherInfoLookup,
    private readonly sender: WebhookEventSender,
  ) {}

  async dispatch(submission: Submission): Promise<void> {
    if (submission.status !== "submitted") return;
    const endReasonRaw = submission.endReason ?? "submitted";
    if (!ALLOWED_END_REASONS.has(endReasonRaw as never)) {
      // Defesa: o dispatcher só fala desses 3 motivos publicamente.
      // `abandoned` (stub) não dispara webhook.
      return;
    }
    const endReason = endReasonRaw as "submitted" | "time_expired" | "violation";

    const [exam, cls, student] = await Promise.all([
      this.exams.findById(ExamId.of(submission.examId)),
      this.classes.findById(ClassId.of(submission.classId)),
      this.students.findById(StudentId.of(submission.studentId)),
    ]);

    if (!exam || !cls || !student) return;
    if (!cls.organizationId) return; // Conta individual sem org — não há endpoints pra notificar.

    const endpoints = await this.endpoints.listByOrg(cls.organizationId);
    const eligible = endpoints.filter(
      (e) =>
        e.enabled &&
        e.environment === "live" &&
        e.events.includes("submission.completed"),
    );
    if (eligible.length === 0) return;

    const teacher = await this.teachers.findById(submission.ownerId);

    const data: CompletedPayload = {
      submissionId: submission.id.toString(),
      examId: exam.id.toString(),
      examTitle: exam.title,
      classId: cls.id.toString(),
      className: cls.name,
      teacherId: submission.ownerId,
      teacherName: teacher?.name ?? "(desconhecido)",
      studentId: student.id.toString(),
      studentName: student.name,
      matricula: student.matricula,
      score: submission.score,
      maxScore: MAX_SCORE,
      correctCount: submission.correctCount,
      questionCount: submission.questionCount,
      submittedAt: (submission.submittedAt ?? new Date()).toISOString(),
      endReason,
    };

    // Cada endpoint dispara em paralelo. Erros são silenciosos no
    // dispatcher — o sender loga no nível baixo. Se um endpoint estiver
    // lento, não bloqueia os outros.
    await Promise.all(
      eligible.map(async (endpoint) => {
        const envelope: Envelope = {
          id: `evt_${randomUUID()}`,
          event: "submission.completed",
          environment: "live",
          organizationId: cls.organizationId!,
          createdAt: new Date().toISOString(),
          data,
        };
        const body = JSON.stringify(envelope);
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = createHmac("sha256", endpoint.signingSecret)
          .update(`${timestamp}.${body}`)
          .digest("hex");

        await this.sender.send({
          url: endpoint.url,
          body,
          headers: {
            "Content-Type": "application/json",
            [SIGNATURE_HEADER]: `t=${timestamp},v1=${signature}`,
          },
        });
      }),
    );
  }
}
