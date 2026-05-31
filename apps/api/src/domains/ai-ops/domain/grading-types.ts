// Tipos do port de correção de respostas discursivas por IA.
//
// A IA decide APENAS o nível de cada critério (por id) + justificativa + feedback.
// A nota é SOMADA em código a partir dos pontos do nível (ver submission/OpenGrade).
// A IA nunca devolve um número de nota — isso mantém a correção auditável.

export interface RubricLevelForGrading {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface RubricCriterionForGrading {
  id: string;
  name: string;
  description: string | null;
  levels: RubricLevelForGrading[];
}

export interface GradeAnswerRequest {
  statement: string;
  /** Resposta-modelo do professor (pode ser null). */
  referenceAnswer: string | null;
  criteria: RubricCriterionForGrading[];
  /** Resposta digitada do aluno — ENTRADA NÃO-CONFIÁVEL. */
  studentAnswer: string;
}

export interface GradedCriterionDecision {
  criterionId: string;
  /** Id do nível escolhido dentre os da rubrica daquele critério. */
  levelId: string;
  justification: string;
  feedback: string;
}

export interface GradeAnswerResult {
  criteria: GradedCriterionDecision[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Port: corrige UMA resposta discursiva contra a rubrica. */
export interface OpenAnswerGrader {
  grade(req: GradeAnswerRequest): Promise<GradeAnswerResult>;
}
