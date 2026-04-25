import type {
  OmrLetter,
  OmrProcessInput,
  OmrProcessResult,
  OmrServiceClient,
} from "../application/omr-service-client.js";
import { OmrServiceError } from "../domain/scan-errors.js";

/**
 * Contrato HTTP com o serviço lucida-omr (Python FastAPI, endpoint /process).
 * Ver `lucida-omr/api_service.py` — os campos snake_case vêm de lá.
 */
interface RawOmrResponse {
  success: boolean;
  studentId?: string | null;
  studentCodeValid?: boolean;
  studentCodeInvalidReason?: string | null;
  answers?: Record<number | string, string | null>;
  score?: number;
  percentage?: number;
  correct?: number;
  incorrect?: number;
  unanswered?: number;
  processingTimeMs?: number;
  reviewReasons?: string[];
  multi_marked_questions?: string[];
  unmarked_questions?: string[];
}

const DEFAULT_TIMEOUT_MS = 60_000;

export class FetchOmrServiceClient implements OmrServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async process(input: OmrProcessInput): Promise<OmrProcessResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: input.imageBase64,
          examId: "external", // o Python exige o campo mas não usa
          answerKey: input.answerKey,
          totalQuestions: input.totalQuestions,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new OmrServiceError(
          `Serviço OMR respondeu ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const raw = (await res.json()) as RawOmrResponse;
      if (!raw.success) {
        throw new OmrServiceError("Serviço OMR não conseguiu processar a folha.");
      }

      return normalizeResponse(raw, input.totalQuestions);
    } catch (err) {
      if (err instanceof OmrServiceError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new OmrServiceError("Tempo esgotado no processamento OMR.");
      }
      throw new OmrServiceError(
        `Falha ao chamar serviço OMR: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function normalizeResponse(
  raw: RawOmrResponse,
  totalQuestions: number,
): OmrProcessResult {
  const rawAnswers = raw.answers ?? {};
  const answers: Record<number, OmrLetter | null> = {};
  for (let i = 1; i <= totalQuestions; i++) {
    const value = rawAnswers[i] ?? rawAnswers[String(i)] ?? null;
    answers[i] = toLetter(value);
  }

  return {
    studentCode: raw.studentId ?? null,
    studentCodeValid: raw.studentCodeValid !== false,
    studentCodeInvalidReason: raw.studentCodeInvalidReason ?? null,
    answers,
    correct: raw.correct ?? 0,
    incorrect: raw.incorrect ?? 0,
    unanswered: raw.unanswered ?? 0,
    score: raw.score ?? 0,
    percentage: raw.percentage ?? 0,
    multiMarkedQuestions: parseQuestionList(raw.multi_marked_questions, totalQuestions),
    unmarkedQuestions: parseQuestionList(raw.unmarked_questions, totalQuestions),
    processingTimeMs: raw.processingTimeMs ?? 0,
    reviewReasons: raw.reviewReasons ?? [],
  };
}

function toLetter(value: string | null): OmrLetter | null {
  if (!value) return null;
  const head = value.trim().charAt(0).toUpperCase();
  if (head === "A" || head === "B" || head === "C" || head === "D" || head === "E") {
    return head;
  }
  return null;
}

/**
 * Python devolve ["q2", "q5", ...] — a gente só considera questões dentro
 * do range da prova (ENEM template tem 100 bubbles; prova pode ter menos).
 */
function parseQuestionList(
  list: string[] | undefined,
  totalQuestions: number,
): number[] {
  if (!list) return [];
  const out: number[] = [];
  for (const item of list) {
    const match = /^q?(\d+)$/i.exec(item);
    if (!match) continue;
    const raw = match[1];
    if (raw === undefined) continue;
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= totalQuestions) out.push(n);
  }
  return out.sort((a, b) => a - b);
}
