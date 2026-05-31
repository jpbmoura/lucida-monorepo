import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";
import { priceGradeBatch } from "../domain/grading-pricing.js";

interface Input {
  examId: string;
  ownerId: string;
  /** Subconjunto opcional; default = todas as submissões com discursivas pendentes. */
  submissionIds?: string[];
}

export interface EstimateGradingPerStudent {
  submissionId: string;
  studentName: string;
  studentCode: string;
  answers: number;
  credits: number;
}

export interface EstimateGradingResult {
  estimatedCredits: number;
  totalAnswers: number;
  perStudent: EstimateGradingPerStudent[];
}

/**
 * Cota o custo da correção por IA contra o consumo REAL: as respostas já estão
 * no banco, então somamos o preço por resposta (rubrica + resposta-modelo +
 * resposta do aluno). Não chama OpenAI, não debita. O número aqui é o que será
 * cobrado em `grade-open-answers`.
 */
export class EstimateGradingUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<EstimateGradingResult> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();

    if (!exam.hasOpenQuestions()) {
      return { estimatedCredits: 0, totalAnswers: 0, perStudent: [] };
    }

    // Índices das questões discursivas (com rubrica) — preço é fixo por questão.
    const openIndices = new Set<number>();
    exam.questions.forEach((q, i) => {
      if (q.type === "open" && q.rubric) openIndices.add(i);
    });

    const filter = input.submissionIds
      ? new Set(input.submissionIds)
      : null;

    const subs = (await this.submissions.findByExamId(exam.id.toString()))
      .filter((s) => s.status === "submitted")
      .filter((s) => s.openQuestionIndices.length > 0)
      .filter((s) => s.gradingStatus !== "graded")
      .filter((s) => !filter || filter.has(s.id.toString()));

    const perStudent: EstimateGradingPerStudent[] = [];
    let totalAnswers = 0;

    for (const sub of subs) {
      const graded = new Set(sub.openGrades.map((g) => g.questionIndex));
      let count = 0;
      for (const qi of sub.openQuestionIndices) {
        if (graded.has(qi)) continue; // já corrigida (rascunho ou aprovada)
        if (!openIndices.has(qi)) continue;
        const answer = sub.textAnswers[qi] ?? "";
        if (answer.trim() === "") continue; // branco é corrigido de graça (0)
        count++;
      }
      if (count === 0) continue;
      totalAnswers += count;
      perStudent.push({
        submissionId: sub.id.toString(),
        studentName: sub.studentName,
        studentCode: sub.studentCode,
        answers: count,
        credits: priceGradeBatch(count),
      });
    }

    return {
      estimatedCredits: perStudent.reduce((s, p) => s + p.credits, 0),
      totalAnswers,
      perStudent,
    };
  }
}
