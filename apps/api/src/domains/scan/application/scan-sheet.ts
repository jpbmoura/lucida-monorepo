import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { StudentRepository } from "@/domains/student/domain/student-repository.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";
import type { ScanRepository } from "../domain/scan-repository.js";
import { ScanResult, type DetectedAnswer } from "../domain/scan-result.js";
import type {
  OmrLetter,
  OmrServiceClient,
} from "./omr-service-client.js";
import { ApproveScanUseCase } from "./approve-scan.js";

interface Input {
  examId: string;
  ownerId: string;
  imageBase64: string;
}

export interface ScanSheetOutput {
  scanId: string;
  /**
   * - "auto_approved" — ScanResult sem pendências; já virou Submission.
   * - "needs_review" — tem pelo menos uma review reason; professor decide.
   */
  outcome: "auto_approved" | "needs_review";
  studentCode: string;
  studentName: string | null;
  score: number;
  correctCount: number;
  questionCount: number;
  requiresReview: boolean;
  reviewReasons: string[];
}

/**
 * Recebe a foto da folha, chama o OMR, resolve o aluno pelo código, salva
 * o ScanResult e — se estiver limpo — cria a Submission imediatamente.
 */
export class ScanSheetUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly students: StudentRepository,
    private readonly submissions: SubmissionRepository,
    private readonly scans: ScanRepository,
    private readonly omr: OmrServiceClient,
    private readonly approveScan: ApproveScanUseCase,
  ) {}

  async execute(input: Input): Promise<ScanSheetOutput> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) {
      throw new ExamNotFoundError();
    }

    const answerKey = buildAnswerKey(exam.questions);
    const totalQuestions = exam.questions.length;

    const omrResult = await this.omr.process({
      imageBase64: input.imageBase64,
      answerKey,
      totalQuestions,
    });

    // Monta array de respostas detectadas (A..E | null) por questão.
    const answers: DetectedAnswer[] = [];
    for (let i = 1; i <= totalQuestions; i++) {
      answers.push(omrResult.answers[i] ?? null);
    }

    const reviewReasons: string[] = [];

    // Resolve aluno pelo código.
    let studentId: string | null = null;
    let studentName: string | null = null;
    const rawCode = (omrResult.studentCode ?? "").trim();

    if (!omrResult.studentCodeValid && omrResult.studentCodeInvalidReason) {
      reviewReasons.push(omrResult.studentCodeInvalidReason);
    } else if (!rawCode) {
      reviewReasons.push("Código do aluno não foi marcado na folha.");
    } else {
      const turmaStudents = await this.students.findByClassId(exam.classId);
      const match = turmaStudents.find((s) => s.code.toString() === rawCode);
      if (match) {
        studentId = match.id.toString();
        studentName = match.name;

        // Dedup: aluno já tem submissão pra essa prova?
        const existing = await this.submissions.findByExamAndStudent(
          exam.id.toString(),
          studentId,
        );
        if (existing && existing.status === "submitted") {
          reviewReasons.push(
            existing.source === "online"
              ? "Aluno já enviou esta prova online — aprovar vai sobrescrever a nota."
              : "Aluno já tem uma digitalização aprovada pra essa prova.",
          );
        }
      } else {
        reviewReasons.push(
          `Código ${rawCode} não corresponde a nenhum aluno desta turma.`,
        );
      }
    }

    // Questões problemáticas — OMR já manda normalizado e dentro do range.
    if (omrResult.multiMarkedQuestions.length > 0) {
      reviewReasons.push(
        `Questões com mais de uma marcação: ${omrResult.multiMarkedQuestions.join(", ")}`,
      );
    }
    if (omrResult.unmarkedQuestions.length > 0) {
      reviewReasons.push(
        `Questões em branco: ${omrResult.unmarkedQuestions.join(", ")}`,
      );
    }

    // Score vem do OMR (lá ele considera key 1-based).
    const correctCount = omrResult.correct;
    const score =
      totalQuestions === 0
        ? 0
        : Math.round((correctCount / totalQuestions) * 100) / 10;

    const scan = ScanResult.create({
      id: this.scans.nextId(),
      examId: exam.id.toString(),
      classId: exam.classId,
      ownerId: exam.ownerId,
      studentCode: rawCode,
      studentCodeValid: omrResult.studentCodeValid,
      studentCodeInvalidReason: omrResult.studentCodeInvalidReason,
      studentId,
      studentName,
      answers,
      correctCount,
      questionCount: totalQuestions,
      score,
      multiMarkedQuestions: omrResult.multiMarkedQuestions,
      unmarkedQuestions: omrResult.unmarkedQuestions,
      imageQuality: "good",
      processingTimeMs: omrResult.processingTimeMs,
      reviewReasons,
    });

    await this.scans.save(scan);

    // Sem pendências + aluno resolvido → já vira Submission.
    if (!scan.requiresReview && scan.canBecomeSubmission()) {
      await this.approveScan.execute({
        scanId: scan.id.toString(),
        ownerId: input.ownerId,
      });
    }

    return {
      scanId: scan.id.toString(),
      outcome: scan.requiresReview ? "needs_review" : "auto_approved",
      studentCode: rawCode,
      studentName,
      score,
      correctCount,
      questionCount: totalQuestions,
      requiresReview: scan.requiresReview,
      reviewReasons: scan.reviewReasons,
    };
  }
}

function buildAnswerKey(
  questions: Array<{ correctAnswer: number }>,
): Record<number, OmrLetter> {
  const letters: OmrLetter[] = ["A", "B", "C", "D", "E"];
  const out: Record<number, OmrLetter> = {};
  questions.forEach((q, idx) => {
    const letter = letters[q.correctAnswer] ?? "A";
    out[idx + 1] = letter;
  });
  return out;
}
