import {
  bumpExtra,
  coerceDate,
  coerceNumber,
  coerceString,
  legacyIdToString,
  newCounts,
  newId,
  parseCorrectAnswer,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyQuestion {
  question?: string;
  context?: string;
  options?: string[];
  correctAnswer?: unknown;
  difficulty?: "fácil" | "médio" | "difícil";
  explanation?: string;
  type?: "multipleChoice" | "trueFalse" | "shortAnswer";
}

interface LegacyExam {
  _id: unknown;
  title?: string;
  classId?: unknown;
  userId?: string;
  description?: string;
  duration?: number;
  questions?: LegacyQuestion[];
  shareId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const VALID_DIFFICULTY = new Set(["fácil", "médio", "difícil"]);

/**
 * Migra Exam. Questões `shortAnswer` são descartadas (tipo não existe no novo
 * schema). Questões sem `type` mas com `options` são recuperadas inferindo o
 * tipo pelo shape das options (2 V/F → trueFalse; ≥ 2 demais → multipleChoice).
 * Questões com `correctAnswer` impossível de parsear são descartadas.
 * Se o exam ficar sem questões válidas, migra mesmo assim (vazio) pra não
 * perder o registro histórico.
 */
export async function runExamsPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.exams = counts;

  const legacyCol = ctx.sourceDb.collection<LegacyExam>(LEGACY.exams);
  const targetCol = ctx.targetDb.collection("exams");

  const query = ctx.userFilter
    ? { userId: { $in: Array.from(ctx.userFilter) } }
    : {};

  const cursor = legacyCol.find(query);
  const limited = ctx.limit != null ? cursor.limit(ctx.limit) : cursor;

  for await (const legacy of limited) {
    counts.processed++;
    const legacyId = legacyIdToString(legacy._id);
    const clerkId = coerceString(legacy.userId);

    try {
      const ownerId = ctx.userMap.get(clerkId);
      if (!ownerId) {
        counts.skipped++;
        ctx.logger({
          entity: "exam",
          status: "skip",
          legacyId,
          reason: `owner not in user map (clerkId=${clerkId})`,
        });
        continue;
      }

      const classId = legacyIdToString(legacy.classId);
      const translated = translateQuestions(legacy.questions ?? []);
      const s = translated.stats;
      if (s.droppedShortAnswer > 0)
        bumpExtra(counts, "dropped-shortAnswer", s.droppedShortAnswer);
      if (s.droppedNoTypeNoOptions > 0)
        bumpExtra(counts, "dropped-no-type-no-options", s.droppedNoTypeNoOptions);
      if (s.droppedBadCorrectAnswer > 0)
        bumpExtra(counts, "dropped-bad-correct-answer", s.droppedBadCorrectAnswer);
      if (s.recoveredAsTrueFalse > 0)
        bumpExtra(counts, "recovered-as-trueFalse", s.recoveredAsTrueFalse);
      if (s.recoveredAsMultipleChoice > 0)
        bumpExtra(counts, "recovered-as-multipleChoice", s.recoveredAsMultipleChoice);

      const shareId = coerceString(legacy.shareId) || newId();

      const createdAt = coerceDate(legacy.createdAt);
      const updatedAt = coerceDate(legacy.updatedAt, createdAt);

      const doc = {
        _id: legacyId,
        classId,
        ownerId,
        title: coerceString(legacy.title, "Prova importada"),
        description: coerceString(legacy.description, ""),
        style: "simple" as const,
        duration: coerceNumber(legacy.duration, 0),
        securityLevel: "off" as const,
        questions: translated.questions,
        shareId,
        usage: null,
        createdAt,
        updatedAt,
      };

      if (!ctx.dryRun) {
        await targetCol.updateOne(
          { _id: legacyId as unknown as never },
          { $set: doc },
          { upsert: true },
        );
      }

      counts.ok++;
      ctx.logger({
        entity: "exam",
        status: "ok",
        legacyId,
        newId: legacyId,
        detail: {
          questions: translated.questions.length,
          dropped:
            s.droppedShortAnswer +
            s.droppedNoTypeNoOptions +
            s.droppedBadCorrectAnswer,
          recovered: s.recoveredAsTrueFalse + s.recoveredAsMultipleChoice,
        },
      });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "exam",
        status: "error",
        legacyId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

interface TranslationStats {
  droppedShortAnswer: number;
  droppedNoTypeNoOptions: number;
  droppedBadCorrectAnswer: number;
  recoveredAsTrueFalse: number;
  recoveredAsMultipleChoice: number;
}

interface TranslatedQuestions {
  questions: Array<{
    type: "multipleChoice" | "trueFalse";
    statement: string;
    context: string | null;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: "fácil" | "médio" | "difícil";
  }>;
  stats: TranslationStats;
}

const TF_POSITIVES = new Set([
  "verdadeiro",
  "verdadeira",
  "true",
  "v",
  "sim",
  "certo",
]);
const TF_NEGATIVES = new Set([
  "falso",
  "falsa",
  "false",
  "f",
  "não",
  "nao",
  "errado",
]);

function looksLikeTrueFalse(options: string[]): boolean {
  if (options.length !== 2) return false;
  const norm = options.map((o) => o.trim().toLowerCase());
  const hasPos = norm.some((o) => TF_POSITIVES.has(o));
  const hasNeg = norm.some((o) => TF_NEGATIVES.has(o));
  return hasPos && hasNeg;
}

function translateQuestions(legacy: LegacyQuestion[]): TranslatedQuestions {
  const questions: TranslatedQuestions["questions"] = [];
  const stats: TranslationStats = {
    droppedShortAnswer: 0,
    droppedNoTypeNoOptions: 0,
    droppedBadCorrectAnswer: 0,
    recoveredAsTrueFalse: 0,
    recoveredAsMultipleChoice: 0,
  };

  for (const q of legacy) {
    const rawOptions = Array.isArray(q.options) ? q.options.filter(Boolean) : [];

    let type: "multipleChoice" | "trueFalse";
    if (q.type === "shortAnswer") {
      stats.droppedShortAnswer++;
      continue;
    } else if (q.type === "multipleChoice" || q.type === "trueFalse") {
      type = q.type;
    } else if (rawOptions.length >= 2) {
      if (looksLikeTrueFalse(rawOptions)) {
        type = "trueFalse";
        stats.recoveredAsTrueFalse++;
      } else {
        type = "multipleChoice";
        stats.recoveredAsMultipleChoice++;
      }
    } else {
      stats.droppedNoTypeNoOptions++;
      continue;
    }

    const effectiveOptions =
      rawOptions.length > 0
        ? rawOptions
        : type === "trueFalse"
          ? ["Verdadeiro", "Falso"]
          : [];

    const correct = parseCorrectAnswer(q.correctAnswer, type, effectiveOptions);
    if (correct == null || effectiveOptions.length === 0) {
      stats.droppedBadCorrectAnswer++;
      continue;
    }

    const difficulty = normalizeDifficulty(q.difficulty);

    questions.push({
      type,
      statement: coerceString(q.question, ""),
      context: q.context ?? null,
      options: effectiveOptions,
      correctAnswer: correct,
      explanation: coerceString(q.explanation, ""),
      difficulty,
    });
  }

  return { questions, stats };
}

function normalizeDifficulty(
  raw: string | undefined,
): "fácil" | "médio" | "difícil" {
  if (raw && VALID_DIFFICULTY.has(raw)) return raw as never;
  return "médio";
}
