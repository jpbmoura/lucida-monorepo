import { ExamQuestionsInvalidError } from "./exam-errors.js";

export type QuestionType = "multipleChoice" | "trueFalse";
export type QuestionDifficulty = "fácil" | "médio" | "difícil";

export interface QuestionProps {
  type: QuestionType;
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
}

// Question é Value Object embutido no Exam — sem identidade própria.
// Mutações criam uma Question nova (imutável) e o Exam substitui no array.
export class Question {
  private constructor(private readonly props: QuestionProps) {}

  static create(input: QuestionProps): Question {
    validate(input);
    return new Question({
      type: input.type,
      statement: input.statement.trim(),
      context: input.context?.trim() || null,
      options: input.options.map((o) => o.trim()),
      correctAnswer: input.correctAnswer,
      explanation: input.explanation.trim(),
      difficulty: input.difficulty,
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

  toJSON(): QuestionProps {
    return { ...this.props, options: [...this.props.options] };
  }
}

function validate(input: QuestionProps): void {
  if (!input.statement || input.statement.trim().length < 3) {
    throw new ExamQuestionsInvalidError("Enunciado muito curto.");
  }
  if (input.type === "multipleChoice") {
    if (input.options.length < 2) {
      throw new ExamQuestionsInvalidError("Múltipla escolha precisa de ao menos 2 opções.");
    }
    if (input.options.length > 6) {
      throw new ExamQuestionsInvalidError("Máximo de 6 opções por questão.");
    }
  } else if (input.type === "trueFalse") {
    if (input.options.length !== 2) {
      throw new ExamQuestionsInvalidError("Verdadeiro/Falso deve ter exatamente 2 opções.");
    }
  }
  if (input.correctAnswer < 0 || input.correctAnswer >= input.options.length) {
    throw new ExamQuestionsInvalidError("Índice da resposta correta fora do intervalo.");
  }
}
