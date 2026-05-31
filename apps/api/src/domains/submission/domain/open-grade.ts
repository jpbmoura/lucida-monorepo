import { OpenGradeInvalidError } from "./submission-errors.js";

/** Resultado da correção de UM critério da rubrica para uma resposta discursiva. */
export interface OpenGradeCriterionResult {
  criterionId: string;
  /** Nível escolhido (id estável da rubrica); "" quando não avaliado. */
  levelId: string;
  /** Pontos do nível escolhido (snapshot da rubrica no momento da correção). */
  points: number;
  /** Justificativa curta da escolha do nível (vazio no manual se não preenchido). */
  justification: string;
  /** Feedback "fez bem / melhore" exibido ao aluno após a correção. */
  feedback: string;
}

/** Origem da correção. */
export type OpenGradeSource = "manual" | "ai";

/**
 * Estado da correção da questão.
 * - "ai_suggested" — rascunho da IA (1ª passada), aguardando aprovação do professor.
 * - "approved"     — correção válida (manual, ou IA aprovada pelo professor).
 *
 * Só grades "approved" entram na nota e contam pra fechar o `gradingStatus`.
 */
export type OpenGradeStatus = "ai_suggested" | "approved";

export interface OpenGradeProps {
  /** Índice da questão discursiva na prova. */
  questionIndex: number;
  criteria: OpenGradeCriterionResult[];
  /** Pontos obtidos = Σ points dos critérios. */
  earned: number;
  /** Pontos máximos da rubrica. */
  max: number;
  /**
   * Sobreposição da fração final pelo professor (0..1).
   * null = usar `earned / max`. Permite o professor ter a palavra final na nota.
   */
  overriddenFraction: number | null;
  source: OpenGradeSource;
  status: OpenGradeStatus;
  gradedByUserId: string | null;
  aiModel: string | null;
  gradedAt: Date;
}

/**
 * Nota de uma resposta discursiva, derivada da rubrica.
 *
 * A nota é SOMADA dos pontos dos níveis (auditável), nunca holística. A
 * contribuição da questão pra nota da prova é uma FRAÇÃO em [0,1]
 * (`earned / max`, ou a sobreposição do professor) — crédito parcial.
 */
export class OpenGrade {
  private constructor(private readonly props: OpenGradeProps) {}

  static create(input: OpenGradeProps): OpenGrade {
    if (!Number.isInteger(input.questionIndex) || input.questionIndex < 0) {
      throw new OpenGradeInvalidError("Índice de questão inválido na correção.");
    }
    if (!Number.isFinite(input.earned) || input.earned < 0) {
      throw new OpenGradeInvalidError("Pontos obtidos inválidos.");
    }
    if (!Number.isFinite(input.max) || input.max < 0) {
      throw new OpenGradeInvalidError("Pontos máximos inválidos.");
    }
    if (
      input.overriddenFraction !== null &&
      (!Number.isFinite(input.overriddenFraction) ||
        input.overriddenFraction < 0 ||
        input.overriddenFraction > 1)
    ) {
      throw new OpenGradeInvalidError("Fração sobreposta deve estar entre 0 e 1.");
    }
    return new OpenGrade({
      ...input,
      criteria: input.criteria.map((c) => ({ ...c })),
    });
  }

  get questionIndex(): number {
    return this.props.questionIndex;
  }
  get criteria(): OpenGradeCriterionResult[] {
    return this.props.criteria.map((c) => ({ ...c }));
  }
  get earned(): number {
    return this.props.earned;
  }
  get max(): number {
    return this.props.max;
  }
  get overriddenFraction(): number | null {
    return this.props.overriddenFraction;
  }
  get source(): OpenGradeSource {
    return this.props.source;
  }
  get status(): OpenGradeStatus {
    return this.props.status;
  }
  get gradedByUserId(): string | null {
    return this.props.gradedByUserId;
  }
  get aiModel(): string | null {
    return this.props.aiModel;
  }
  get gradedAt(): Date {
    return this.props.gradedAt;
  }

  /** Contribuição da questão pra nota da prova, em [0,1]. */
  fraction(): number {
    const raw =
      this.props.overriddenFraction !== null
        ? this.props.overriddenFraction
        : this.props.max > 0
          ? this.props.earned / this.props.max
          : 0;
    return Math.min(1, Math.max(0, raw));
  }

  toJSON(): OpenGradeProps {
    return { ...this.props, criteria: this.criteria };
  }
}
