import {
  bumpExtra,
  coerceDate,
  coerceNumber,
  coerceString,
  deriveNameFromEmail,
  formatStudentCode,
  legacyIdToString,
  newCounts,
  newId,
  parseStudentCode,
} from "./helpers.js";
import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

interface LegacyResult {
  _id: unknown;
  examId: unknown;
  classId: unknown;
  email?: string;
  score?: number;
  percentage?: number;
  examQuestionCount?: number;
  answers?: Array<{
    questionIndex?: number;
    answer?: unknown;
    score?: number;
    needsReview?: boolean;
    feedback?: string;
    gradedByAI?: boolean;
  }>;
  needsGrading?: boolean;
  createdAt?: unknown;
}

interface TargetStudentDoc {
  _id: string;
  classId: string;
  ownerId: string;
  code: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TargetExamSlim {
  _id: string;
  ownerId: string;
  classId: string;
}

/**
 * Para cada Result legacy cria uma Submission. Resolve o Student por
 * `classId + email` — se não existe, cria um Student automaticamente
 * preservando histórico (regra #8 do plano).
 *
 * Cache em memória do próximo código sequencial por classId pra evitar
 * round-trip N+1 em classes com muitas submissões.
 */
export async function runSubmissionsPhase(ctx: MigrationContext): Promise<void> {
  const counts = newCounts();
  ctx.summary.submissions = counts;

  const legacyResults = ctx.sourceDb.collection<LegacyResult>(LEGACY.results);
  const targetSubs = ctx.targetDb.collection("submissions");
  const targetStudents = ctx.targetDb.collection<TargetStudentDoc>("students");
  const targetExams = ctx.targetDb.collection<TargetExamSlim>("exams");

  const nextCodeByClass = new Map<string, number>();

  async function nextCode(classId: string): Promise<string> {
    const cached = nextCodeByClass.get(classId);
    if (cached != null) {
      nextCodeByClass.set(classId, cached + 1);
      return formatStudentCode(cached);
    }
    const last = await targetStudents.findOne(
      { classId },
      { projection: { code: 1 }, sort: { code: -1 } },
    );
    const seed = Math.max(parseStudentCode(last?.code), 0) + 1;
    nextCodeByClass.set(classId, seed + 1);
    return formatStudentCode(seed);
  }

  // Busca a coleção toda? Pro QA ok. Pra prod, pode ser iterada em batches.
  const cursor = legacyResults.find({});
  const limited = ctx.limit != null ? cursor.limit(ctx.limit) : cursor;

  for await (const legacy of limited) {
    counts.processed++;
    const legacyId = legacyIdToString(legacy._id);
    const email = coerceString(legacy.email).trim().toLowerCase();

    try {
      if (!email) {
        counts.skipped++;
        ctx.logger({
          entity: "submission",
          status: "skip",
          legacyId,
          reason: "result has no email",
        });
        continue;
      }

      const examId = legacyIdToString(legacy.examId);
      const classId = legacyIdToString(legacy.classId);

      // ownerId: deriva do exam migrado — esse é o único vínculo confiável
      // entre Result e user (Result não tem userId).
      const exam = await targetExams.findOne(
        { _id: examId as unknown as never },
        { projection: { ownerId: 1, classId: 1 } },
      );
      if (!exam) {
        counts.skipped++;
        ctx.logger({
          entity: "submission",
          status: "skip",
          legacyId,
          reason: `exam ${examId} not found in target (skipped or not migrated)`,
        });
        continue;
      }

      const effectiveClassId = classId || exam.classId;

      // Resolve ou cria Student.
      let studentDoc = await targetStudents.findOne({
        classId: effectiveClassId,
        email,
      });

      if (!studentDoc) {
        const studentId = newId();
        const code = await nextCode(effectiveClassId);
        const matricula = await pickMatricula(
          ctx,
          exam.ownerId,
          email,
          effectiveClassId,
        );
        const now = coerceDate(legacy.createdAt);
        studentDoc = {
          _id: studentId,
          classId: effectiveClassId,
          ownerId: exam.ownerId,
          code,
          name: deriveNameFromEmail(email),
          matricula,
          email,
          createdAt: now,
          updatedAt: now,
        };
        if (!ctx.dryRun) {
          await targetStudents.insertOne(studentDoc);
        }
        bumpExtra(counts, "students-auto-created");
      }

      // Monta a submission.
      const questionCount = coerceNumber(
        legacy.examQuestionCount,
        Array.isArray(legacy.answers) ? legacy.answers.length : 0,
      );
      const answers = buildAnswerStrings(legacy.answers, questionCount);
      const correctCount = (legacy.answers ?? []).filter(
        (a) => (a.score ?? 0) > 0,
      ).length;
      const score = coerceNumber(legacy.score, 0);
      const submittedAt = coerceDate(legacy.createdAt);

      const doc = {
        _id: legacyId,
        examId,
        classId: effectiveClassId,
        ownerId: exam.ownerId,
        studentId: studentDoc._id,
        studentCode: studentDoc.code,
        studentName: studentDoc.name,
        source: "online",
        status: "submitted",
        answers,
        correctCount,
        questionCount,
        score,
        startedAt: submittedAt,
        submittedAt,
        endReason: "submitted",
        integrityFlags: {
          tabSwitches: 0,
          focusLosses: 0,
          copyAttempts: 0,
          rightClickAttempts: 0,
          violationCount: 0,
        },
        createdAt: submittedAt,
        updatedAt: submittedAt,
      };

      if (!ctx.dryRun) {
        // submissions tem índice unique em (examId, studentId). Upsert por
        // _id + dedup: se já existe outro doc (examId,studentId) é skip.
        const dupe = await targetSubs.findOne({
          examId,
          studentId: studentDoc._id,
          _id: { $ne: legacyId as unknown as never },
        });
        if (dupe) {
          counts.skipped++;
          ctx.logger({
            entity: "submission",
            status: "skip",
            legacyId,
            reason: `duplicate (examId+studentId) already exists as ${String(dupe._id)}`,
          });
          continue;
        }
        await targetSubs.updateOne(
          { _id: legacyId as unknown as never },
          { $set: doc },
          { upsert: true },
        );
      }

      counts.ok++;
      ctx.logger({
        entity: "submission",
        status: "ok",
        legacyId,
        newId: legacyId,
        detail: { studentId: studentDoc._id },
      });
    } catch (err) {
      counts.errors++;
      ctx.logger({
        entity: "submission",
        status: "error",
        legacyId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function buildAnswerStrings(
  raw: LegacyResult["answers"],
  questionCount: number,
): Array<string | null> {
  const size = Math.max(questionCount, raw?.length ?? 0);
  const out: Array<string | null> = new Array(size).fill(null);
  if (!raw) return out;
  for (const a of raw) {
    const idx = typeof a.questionIndex === "number" ? a.questionIndex : -1;
    if (idx < 0 || idx >= out.length) continue;
    if (a.answer == null) continue;
    out[idx] = typeof a.answer === "string" ? a.answer : String(a.answer);
  }
  return out;
}

/**
 * Unique constraint: (ownerId, matricula). Primeira tentativa usa email;
 * se já existir (porque o mesmo aluno está em outra classe do mesmo professor),
 * desambigua com sufixo do classId.
 */
async function pickMatricula(
  ctx: MigrationContext,
  ownerId: string,
  email: string,
  classId: string,
): Promise<string> {
  const targetStudents = ctx.targetDb.collection("students");
  const taken = await targetStudents.findOne(
    { ownerId, matricula: email },
    { projection: { _id: 1 } },
  );
  if (!taken) return email;
  return `${email}#${classId.slice(-6)}`;
}
