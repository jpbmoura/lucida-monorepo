// Backfill: cria 1 curso "Geral" por professor e popula `courseId`
// nas turmas, alunos, provas e submissões correspondentes.
//
// Idempotente:
//   - reusa o curso "Geral" se já existir pra aquele ownerId;
//   - só atualiza docs onde `courseId` é null/missing.
//
// Uso:
//   pnpm --filter @lucida/api run backfill:courses
//
// Flags:
//   --dry-run    relata o que faria sem escrever
//
// Pré-requisito:
//   - Schemas atualizados (Fase 2) com `courseId` nullable.
//   - Replica set não é necessário (tudo updateMany simples).
//
// Ordem das operações pra cada professor:
//   1. Resolve/cria o curso "Geral".
//   2. updateMany classes: { ownerId, courseId: null } → { courseId }.
//   3. updateMany students/exams/submissions onde classId IN (turmas do owner)
//      e courseId é null, populando o courseId via class.courseId.
//
// O passo 3 é por turma, não por owner direto, pra que cada doc receba o
// courseId da sua respectiva turma (e não um courseId genérico). Em Fase 1
// só existe o curso "Geral" por professor, então na prática todas as
// turmas do mesmo owner caem no mesmo courseId — mas o algoritmo já
// suporta o cenário de Fase 4+ onde o professor terá vários cursos.

import { randomUUID } from "node:crypto";
import {
  connectMongo,
  disconnectMongo,
} from "../../src/infrastructure/database/mongodb/connection.js";
import { env } from "../../src/env.js";
import {
  getAuthDb,
  closeAuthDb,
} from "../../src/domains/iam/infrastructure/better-auth/mongo-client.js";
import mongoose from "mongoose";
import { ClassModel } from "../../src/domains/class/infrastructure/class-schema.js";
import { CourseModel } from "../../src/domains/course/infrastructure/course-schema.js";
import { StudentModel } from "../../src/domains/student/infrastructure/student-schema.js";
import { ExamModel } from "../../src/domains/exam/infrastructure/exam-schema.js";
import { SubmissionModel } from "../../src/domains/submission/infrastructure/submission-schema.js";

const DEFAULT_COURSE_NAME = "Geral";
const DEFAULT_COURSE_DESCRIPTION =
  "Curso padrão criado automaticamente. Renomeie ou crie outros cursos para organizar suas turmas.";

interface CourseSummary {
  courseId: string;
  created: boolean;
  organizationId: string | null;
}

async function resolveDefaultCourse(
  ownerId: string,
  organizationId: string | null,
  dryRun: boolean,
): Promise<CourseSummary> {
  const existing = await CourseModel.findOne({
    ownerId,
    name: DEFAULT_COURSE_NAME,
  })
    .lean<{ _id: string; organizationId: string | null }>()
    .exec();

  if (existing) {
    return {
      courseId: existing._id,
      created: false,
      organizationId: existing.organizationId ?? null,
    };
  }

  const courseId = randomUUID();
  if (dryRun) {
    return { courseId, created: true, organizationId };
  }

  const now = new Date();
  await CourseModel.updateOne(
    { _id: courseId },
    {
      $set: {
        name: DEFAULT_COURSE_NAME,
        description: DEFAULT_COURSE_DESCRIPTION,
        ownerId,
        organizationId,
      },
      $setOnInsert: {
        _id: courseId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return { courseId, created: true, organizationId };
}

interface OwnerOrgSnapshot {
  organizationId: string | null;
}

/**
 * Lê `organizationId` snapshot pro owner — preferimos a turma mais antiga
 * que já tenha snapshot (caso o backfill-class-org já tenha rodado);
 * se nenhuma turma tem org, fica null. Não consultamos BetterAuth aqui
 * porque o organizationId no Course é pure snapshot — null é OK pra
 * professores individuais.
 */
async function snapshotOrgForOwner(ownerId: string): Promise<OwnerOrgSnapshot> {
  const cls = await ClassModel.findOne({
    ownerId,
    organizationId: { $type: "string" },
  })
    .sort({ createdAt: 1 })
    .select({ organizationId: 1 })
    .lean<{ organizationId: string | null }>()
    .exec();
  return { organizationId: cls?.organizationId ?? null };
}

interface OwnerStats {
  classesUpdated: number;
  studentsUpdated: number;
  examsUpdated: number;
  submissionsUpdated: number;
}

async function backfillOwner(
  ownerId: string,
  courseId: string,
  dryRun: boolean,
): Promise<OwnerStats> {
  const stats: OwnerStats = {
    classesUpdated: 0,
    studentsUpdated: 0,
    examsUpdated: 0,
    submissionsUpdated: 0,
  };

  const classFilter = {
    ownerId,
    $or: [{ courseId: { $exists: false } }, { courseId: null }],
  };

  // 1. Conta turmas que precisam de update (pra log).
  const classesToUpdate = await ClassModel.countDocuments(classFilter).exec();
  stats.classesUpdated = classesToUpdate;

  if (classesToUpdate === 0) {
    return stats; // Owner já backfilled.
  }

  // 2. Coleta IDs das turmas que vão ganhar courseId — usado pra propagar
  // em students/exams/submissions logo abaixo.
  const classIdsToBackfill = await ClassModel.find(classFilter)
    .select({ _id: 1 })
    .lean<{ _id: string }[]>()
    .exec();
  const classIds = classIdsToBackfill.map((c) => c._id);

  if (dryRun) {
    const [studentsCount, examsCount, submissionsCount] = await Promise.all([
      StudentModel.countDocuments({
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      }).exec(),
      ExamModel.countDocuments({
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      }).exec(),
      SubmissionModel.countDocuments({
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      }).exec(),
    ]);
    stats.studentsUpdated = studentsCount;
    stats.examsUpdated = examsCount;
    stats.submissionsUpdated = submissionsCount;
    return stats;
  }

  // 3. Atualiza turmas.
  await ClassModel.updateMany(classFilter, { $set: { courseId } }).exec();

  // 4. Propaga em students/exams/submissions (em paralelo — ops independentes).
  const [studentsRes, examsRes, submissionsRes] = await Promise.all([
    StudentModel.updateMany(
      {
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      },
      { $set: { courseId } },
    ).exec(),
    ExamModel.updateMany(
      {
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      },
      { $set: { courseId } },
    ).exec(),
    SubmissionModel.updateMany(
      {
        classId: { $in: classIds },
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
      },
      { $set: { courseId } },
    ).exec(),
  ]);

  stats.studentsUpdated = studentsRes.modifiedCount;
  stats.examsUpdated = examsRes.modifiedCount;
  stats.submissionsUpdated = submissionsRes.modifiedCount;
  return stats;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  await connectMongo(env.MONGODB_URI);
  // BetterAuth db conectado só pra simetria com outros backfills — não
  // consultamos aqui, mas garantimos que disconnect funcione no finally.
  await getAuthDb(env.MONGODB_URI);

  const ownerIds = (await ClassModel.distinct("ownerId").exec()) as string[];

  let coursesCreated = 0;
  let coursesReused = 0;
  let totalClasses = 0;
  let totalStudents = 0;
  let totalExams = 0;
  let totalSubmissions = 0;
  let ownersTouched = 0;

  for (const ownerId of ownerIds) {
    const orgSnapshot = await snapshotOrgForOwner(ownerId);
    const courseSummary = await resolveDefaultCourse(
      ownerId,
      orgSnapshot.organizationId,
      dryRun,
    );

    if (courseSummary.created) {
      coursesCreated++;
    } else {
      coursesReused++;
    }

    const stats = await backfillOwner(ownerId, courseSummary.courseId, dryRun);

    if (
      stats.classesUpdated > 0 ||
      stats.studentsUpdated > 0 ||
      stats.examsUpdated > 0 ||
      stats.submissionsUpdated > 0
    ) {
      ownersTouched++;
    }

    totalClasses += stats.classesUpdated;
    totalStudents += stats.studentsUpdated;
    totalExams += stats.examsUpdated;
    totalSubmissions += stats.submissionsUpdated;

    if (stats.classesUpdated > 0) {
      console.log(
        `[${dryRun ? "dry" : "ok"}] owner=${ownerId} course=${courseSummary.courseId}` +
          ` (${courseSummary.created ? "created" : "reused"}) ` +
          `classes=${stats.classesUpdated} students=${stats.studentsUpdated} ` +
          `exams=${stats.examsUpdated} submissions=${stats.submissionsUpdated}`,
      );
    }
  }

  console.log(`
═══════════════ BACKFILL COURSES ${dryRun ? "(DRY-RUN) " : ""}═══════════════
  owners inspecionados:        ${ownerIds.length}
  owners atualizados:          ${ownersTouched}
  cursos "${DEFAULT_COURSE_NAME}" criados:  ${coursesCreated}
  cursos "${DEFAULT_COURSE_NAME}" reusados: ${coursesReused}
  classes  atualizadas:        ${totalClasses}
  students atualizados:        ${totalStudents}
  exams    atualizados:        ${totalExams}
  submissions atualizadas:     ${totalSubmissions}
══════════════════════════════════════════════════════════
`);
}

main()
  .then(async () => {
    await disconnectMongo();
    await closeAuthDb();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    await mongoose.disconnect().catch(() => undefined);
    await closeAuthDb().catch(() => undefined);
    process.exit(1);
  });
