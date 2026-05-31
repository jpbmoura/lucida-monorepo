import { ExamQuestionsInvalidError } from "./exam-errors.js";
import { Rubric, type RubricData } from "./rubric.js";

export type QuestionType = "multipleChoice" | "trueFalse" | "open";
export type QuestionDifficulty = "fácil" | "médio" | "difícil";

/**
 * Entrada para criar uma Question.
 * - Objetiva (`multipleChoice`/`trueFalse`): exige `options` e `correctAnswer`,
 *   `rubric` deve ser ausente/null.
 * - Discursiva (`open`): exige `rubric`; `options`/`correctAnswer` são ignorados,
 *   `referenceAnswer` é opcional (resposta-modelo).
 */
export interface QuestionInput {
  type: QuestionType;
  statement: string;
  context: string | null;
  options?: string[];
  correctAnswer?: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  rubric?: RubricData | null;
  referenceAnswer?: string | null;
}

/** Forma serializável da Question (persistência e API). */
export interface QuestionSnapshot {
  type: QuestionType;
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  rubric: RubricData | null;
  referenceAnswer: string | null;
}

interface QuestionProps {
  type: QuestionType;
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  rubric: Rubric | null;
  referenceAnswer: string | null;
}

// Question é Value Object embutido no Exam — sem identidade própria.
// Mutações criam uma Question nova (imutável) e o Exam substitui no array.
export class Question {
  private constructor(private readonly props: QuestionProps) {}

  static create(input: QuestionInput): Question {
    validate(input);
    const isOpen = input.type === "open";
    const options = input.options ?? [];
    return new Question({
      type: input.type,
      statement: input.statement.trim(),
      context: input.context?.trim() || null,
      options: isOpen ? [] : options.map((o) => o.trim()),
      correctAnswer: isOpen ? -1 : input.correctAnswer ?? -1,
      explanation: input.explanation.trim(),
      difficulty: input.difficulty,
      rubric: isOpen && input.rubric ? Rubric.create(input.rubric) : null,
      referenceAnswer: isOpen ? input.referenceAnswer?.trim() || null : null,
    });
  }

  get type(): QuestionType {
    return this.props.type;
  }
  get statement(): string {
    return this.props.statement;
  }
  get context(): string | null {
    return this.props.context;
  }
  get options(): string[] {
    return [...this.props.options];
  }
  get correctAnswer(): number {
    return this.props.correctAnswer;
  }
  get explanation(): string {
    return this.props.explanation;
  }
  get difficulty(): QuestionDifficulty {
    return this.props.difficulty;
  }
  get rubric(): Rubric | null {
    return this.props.rubric;
  }
  get referenceAnswer(): string | null {
    return this.props.referenceAnswer;
  }

  /** Pontos máximos da questão: discursiva = soma da rubrica; objetiva = 1. */
  maxPoints(): number {
    return this.props.rubric ? this.props.rubric.maxPoints() : 1;
  }

  toJSON(): QuestionSnapshot {
    return {
      type: this.props.type,
      statement: this.props.statement,
      context: this.props.context,
      options: [...this.props.options],
      correctAnswer: this.props.correctAnswer,
      explanation: this.props.explanation,
      difficulty: this.props.difficulty,
      rubric: this.props.rubric ? this.props.rubric.toJSON() : null,
      referenceAnswer: this.props.referenceAnswer,
    };
  }
}

function validate(input: QuestionInput): void {
  if (!input.statement || input.statement.trim().length < 3) {
    throw new ExamQuestionsInvalidError("Enunciado muito curto.");
  }

  if (input.type === "open") {
    if (!input.rubric) {
      throw new ExamQuestionsInvalidError("Questão discursiva precisa de rubrica.");
    }
    // Rubric.create (chamado em create) valida a estrutura da rubrica.
    return;
  }

  if (input.rubric) {
    throw new ExamQuestionsInvalidError("Questão objetiva não pode ter rubrica.");
  }

  const options = input.options ?? [];
  if (input.type === "multipleChoice") {
    if (options.length < 2) {
      throw new ExamQuestionsInvalidError("Múltipla escolha precisa de ao menos 2 opções.");
    }
    if (options.length > 6) {
      throw new ExamQuestionsInvalidError("Máximo de 6 opções por questão.");
    }
  } else if (input.type === "trueFalse") {
    if (options.length !== 2) {
      throw new ExamQuestionsInvalidError("Verdadeiro/Falso deve ter exatamente 2 opções.");
    }
  }

  const correctAnswer = input.correctAnswer ?? -1;
  if (correctAnswer < 0 || correctAnswer >= options.length) {
    throw new ExamQuestionsInvalidError("Índice da resposta correta fora do intervalo.");
  }
}
