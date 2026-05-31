import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { Rubric } from "@/domains/exam/domain/rubric.js";
import type { Question } from "@/domains/exam/domain/question.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";
import {
  OpenGrade,
  type OpenGradeCriterionResult,
} from "@/domains/submission/domain/open-grade.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import {
  priceGradeAnswer,
  type GradeAnswerCost,
} from "../domain/grading-pricing.js";
import type { OpenAnswerGrader } from "../domain/grading-types.js";

export interface GradingProgress {
  graded: number;
  total: number;
}

interface Input {
  ownerId: string;
  activeOrganizationId: string | null;
  actorRealUserId?: string;
  examId: string;
  submissionIds?: string[];
  onProgress?: (p: GradingProgress) => void;
}

export interface GradeOpenAnswersResult {
  gradedSubmissions: number;
  gradedAnswers: number;
  creditsSpent: number;
}

interface WorkItem {
  questionIndex: number;
  question: Question;
  rubric: Rubric;
  answer: string;
  blank: boolean;
  cost: GradeAnswerCost;
}

/**
 * Correção por IA (1ª passada). Para cada resposta discursiva ainda não
 * corrigida, chama o grader (que decide só o nível por critério), monta uma
 * nota RASCUNHO (`ai_suggested`, não conta na nota até o professor aprovar) e
 * debita por resposta. Respostas em branco são corrigidas de graça (nível 0).
 * Human-in-the-loop: nada vira nota final aqui — só sugestão.
 */
export class GradeOpenAnswersUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
    private readonly billing: BillingService,
    private readonly grader: OpenAnswerGrader,
  ) {}

  async execute(input: Input): Promise<GradeOpenAnswersResult> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();
    if (!exam.hasOpenQuestions()) {
      return { gradedSubmissions: 0, gradedAnswers: 0, creditsSpent: 0 };
    }

    const filter = input.submissionIds ? new Set(input.submissionIds) : null;
    const subs = (await this.submissions.findByExamId(exam.id.toString()))
      .filter((s) => s.status === "submitted")
      .filter((s) => s.openQuestionIndices.length > 0)
      .filter((s) => s.gradingStatus !== "graded")
      .filter((s) => !filter || filter.has(s.id.toString()));

    // Monta a lista de trabalho e o custo total (só respostas não-brancas pagam).
    const work: Array<{
      submissionId: string;
      items: WorkItem[];
    }> = [];
    let totalEstimate = 0;

    for (const sub of subs) {
      const graded = new Set(sub.openGrades.map((g) => g.questionIndex));
      const items: WorkItem[] = [];
      for (const qi of sub.openQuestionIndices) {
        if (graded.has(qi)) continue;
        const q = exam.questions[qi];
        if (!q || q.type !== "open" || !q.rubric) continue;
        const answer = sub.textAnswers[qi] ?? "";
        const blank = answer.trim() === "";
        const cost: GradeAnswerCost = {
          criteriaCount: q.rubric.criteria.length,
          answerChars: answer.length,
          rubricChars: JSON.stringify(q.rubric.toJSON()).length,
          referenceChars: q.referenceAnswer?.length ?? 0,
        };
        if (!blank) totalEstimate += priceGradeAnswer(cost);
        items.push({
          questionIndex: qi,
          question: q,
          rubric: q.rubric,
          answer,
          blank,
          cost,
        });
      }
      if (items.length > 0) {
        work.push({ submissionId: sub.id.toString(), items });
      }
    }

    if (work.length === 0) {
      return { gradedSubmissions: 0, gradedAnswers: 0, creditsSpent: 0 };
    }

    // Bloqueia se o saldo não cobre o lote inteiro (evita parar no meio).
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: totalEstimate,
    });

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;

    let gradedAnswers = 0;
    let creditsSpent = 0;
    const total = work.length;

    for (let w = 0; w < work.length; w++) {
      const entry = work[w]!;
      // Recarrega a submissão (estado fresco) pra aplicar os rascunhos.
      const subById = subs.find((s) => s.id.toString() === entry.submissionId);
      if (!subById) continue;

      const drafts: OpenGrade[] = [];
      for (const item of entry.items) {
        const now = new Date();
        if (item.blank) {
          drafts.push(buildBlankDraft(item.rubric, item.questionIndex, now));
          continue;
        }

        const result = await this.grader.grade({
          statement: item.question.statement,
          referenceAnswer: item.question.referenceAnswer,
          criteria: item.rubric.criteria.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? null,
            levels: c.levels.map((l) => ({
              id: l.id,
              label: l.label,
              points: l.points,
              descriptor: l.descriptor,
            })),
          })),
          studentAnswer: item.answer,
        });

        drafts.push(
          buildAiDraft(item.rubric, item.questionIndex, result, now),
        );

        await this.billing.debit({
          userId: input.ownerId,
          activeOrganizationId: input.activeOrganizationId,
          amount: priceGradeAnswer(item.cost),
          reason: "ai_consumption",
          relatedAction: "grade_open_answer",
          tokensUsed: result.inputTokens + result.outputTokens,
          metadata: {
            examId: input.examId,
            submissionId: entry.submissionId,
            questionIndex: item.questionIndex,
            ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
          },
        });
        creditsSpent += priceGradeAnswer(item.cost);
        gradedAnswers++;
      }

      subById.applyOpenGrades(drafts);
      await this.submissions.save(subById);
      input.onProgress?.({ graded: w + 1, total });
    }

    return { gradedSubmissions: work.length, gradedAnswers, creditsSpent };
  }
}

/** Resolve os pontos de cada critério pelo nível escolhido e monta o rascunho. */
function buildAiDraft(
  rubric: Rubric,
  questionIndex: number,
  result: { criteria: Array<{ criterionId: string; levelId: string; justification: string; feedback: string }>; model: string },
  now: Date,
): OpenGrade {
  const byCriterion = new Map(result.criteria.map((c) => [c.criterionId, c]));
  const criteria: OpenGradeCriterionResult[] = rubric.criteria.map((rc) => {
    const got = byCriterion.get(rc.id);
    const level = got ? rc.levels.find((l) => l.id === got.levelId) : undefined;
    return {
      criterionId: rc.id,
      levelId: level?.id ?? "",
      points: level?.points ?? 0,
      justification: got?.justification ?? "",
      feedback: got?.feedback ?? "",
    };
  });
  const earned = criteria.reduce((s, c) => s + c.points, 0);
  return OpenGrade.create({
    questionIndex,
    criteria,
    earned,
    max: rubric.maxPoints(),
    overriddenFraction: null,
    source: "ai",
    status: "ai_suggested",
    gradedByUserId: null,
    aiModel: result.model,
    gradedAt: now,
  });
}

/** Resposta em branco → menor nível de cada critério, sem chamada de IA. */
function buildBlankDraft(
  rubric: Rubric,
  questionIndex: number,
  now: Date,
): OpenGrade {
  const criteria: OpenGradeCriterionResult[] = rubric.criteria.map((rc) => {
    const lowest = [...rc.levels].sort((a, b) => a.points - b.points)[0];
    return {
      criterionId: rc.id,
      levelId: lowest?.id ?? "",
      points: lowest?.points ?? 0,
      justification: "Resposta em branco.",
      feedback: "Você deixou esta questão em branco.",
    };
  });
  const earned = criteria.reduce((s, c) => s + c.points, 0);
  return OpenGrade.create({
    questionIndex,
    criteria,
    earned,
    max: rubric.maxPoints(),
    overriddenFraction: null,
    source: "ai",
    status: "ai_suggested",
    gradedByUserId: null,
    aiModel: null,
    gradedAt: now,
  });
}
