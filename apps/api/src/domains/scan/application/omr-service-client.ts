/**
 * Cliente pro serviço OMR Python (lucida-omr). Fica no application layer
 * como interface — o use case depende daqui, não da implementação HTTP.
 */

export type OmrLetter = "A" | "B" | "C" | "D" | "E";

export interface OmrProcessInput {
  imageBase64: string;
  /** Key 1-based → letra correta. Usado pelo serviço pra já devolver score. */
  answerKey: Record<number, OmrLetter>;
  totalQuestions: number;
}

export interface OmrProcessResult {
  studentCode: string | null;
  studentCodeValid: boolean;
  studentCodeInvalidReason: string | null;
  /** Key 1-based → letra marcada (A..E) ou null se vazio/inválido. */
  answers: Record<number, OmrLetter | null>;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  percentage: number;
  multiMarkedQuestions: number[];
  unmarkedQuestions: number[];
  processingTimeMs: number;
  reviewReasons: string[];
}

export interface OmrServiceClient {
  process(input: OmrProcessInput): Promise<OmrProcessResult>;
}
