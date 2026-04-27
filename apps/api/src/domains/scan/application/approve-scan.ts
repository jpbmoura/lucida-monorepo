import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import { Submission } from "@/domains/submission/domain/submission.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";
import type { SubmissionEventDispatcher } from "@/domains/submission/application/submit-exam.js";
import type { ScanRepository } from "../domain/scan-repository.js";
import { ScanId } from "../domain/scan-id.js";
import {
  ScanCannotBeApprovedError,
  ScanNotFoundError,
} from "../domain/scan-errors.js";

interface Input {
  scanId: string;
  ownerId: string;
}

/**
 * Aprova uma digitalização (ou confirma a auto-aprovação) e a transforma
 * em Submission. Se o aluno já tem submissão pra essa prova, sobrescreve.
 *
 * Letras A..E viram índices 0..n conforme a Question do Exam (que armazena
 * correctAnswer como índice).
 */
export class ApproveScanUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly scans: ScanRepository,
    private readonly submissions: SubmissionRepository,
    /** Opcional — dispara webhook `submission.completed` ao aprovar. */
    private readonly dispatcher?: SubmissionEventDispatcher,
  ) {}

  async execute(input: Input): Promise<void> {
    const scan = await this.scans.findById(ScanId.of(input.scanId));
    if (!scan || !scan.isOwnedBy(input.ownerId)) {
      throw new ScanNotFoundError();
    }

    if (!scan.studentId || !scan.studentName) {
      throw new ScanCannotBeApprovedError(
        "Associe um aluno à digitalização antes de aprovar.",
      );
    }

    const exam = await this.exams.findById(ExamId.of(scan.examId));
    if (!exam) throw new ExamNotFoundError();

    // Converte letras detectadas (A..E | null) pros índices das opções da
    // questão. Se a letra não bate com nenhuma opção disponível, vira null
    // (tratamento defensivo — o OMR já normaliza, mas alguém pode ter prova
    // com só 4 opções e OMR detectando E).
    const answersAsIndices: Array<number | null> = scan.answers.map((letter, i) => {
      if (!letter) return null;
      const question = exam.questions[i];
      if (!question) return null;
      const idx = letter.toUpperCase().charCodeAt(0) - 65;
      if (idx < 0 || idx >= question.options.length) return null;
      return idx;
    });

    // Upsert: se o aluno já tem submissão (online ou scanner), sobrescreve.
    // O repo usa upsert por submissionId, então procuramos antes pra reusar o id.
    const existing = await this.submissions.findByExamAndStudent(
      scan.examId,
      scan.studentId,
    );
    const submissionId = existing?.id ?? this.submissions.nextId();

    const correctAnswers = exam.questions.map((q) => q.correctAnswer);
    const submission = Submission.completed({
      id: submissionId,
      examId: scan.examId,
      classId: scan.classId,
      ownerId: scan.ownerId,
      studentId: scan.studentId,
      studentCode: scan.studentCode,
      studentName: scan.studentName,
      source: "scanner",
      answers: answersAsIndices,
      correctAnswers,
      at: scan.scannedAt,
    });

    await this.submissions.save(submission);

    // Fire-and-forget — não bloqueia a aprovação se o endpoint do
    // parceiro estiver lento.
    if (this.dispatcher) {
      this.dispatcher.dispatch(submission).catch(() => undefined);
    }

    scan.markApproved();
    await this.scans.save(scan);
  }
}
