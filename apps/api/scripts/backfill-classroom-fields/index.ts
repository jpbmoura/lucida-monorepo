// Backfill: garante os campos da integração Google Classroom nos docs
// antigos (criados antes deste deploy). Idempotente — só preenche onde o
// campo está ausente; os defaults do schema já cobrem docs novos.
//
//   classes.classroomCourseId       → null  (turma não vinculada)
//   exams.courseWorkId              → null  (prova não enviada)
//   students.classroomUserId        → null  (aluno não veio do Classroom)
//   students.classroomRemovedAt     → null  (presente / N/A)
//
// Uso:
//   pnpm --filter @lucida/api run backfill:classroom-fields
//
// Flags:
//   --dry-run    relata o que faria sem escrever

import {
  connectMongo,
  disconnectMongo,
} from "../../src/infrastructure/database/mongodb/connection.js";
import { env } from "../../src/env.js";
import { ClassModel } from "../../src/domains/class/infrastructure/class-schema.js";
import { ExamModel } from "../../src/domains/exam/infrastructure/exam-schema.js";
import { StudentModel } from "../../src/domains/student/infrastructure/student-schema.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  await connectMongo(env.MONGODB_URI);

  const classFilter = { classroomCourseId: { $exists: false } };
  const examFilter = { courseWorkId: { $exists: false } };
  const studentFilter = {
    $or: [
      { classroomUserId: { $exists: false } },
      { classroomRemovedAt: { $exists: false } },
    ],
  };

  const classes = await ClassModel.countDocuments(classFilter).exec();
  const exams = await ExamModel.countDocuments(examFilter).exec();
  const students = await StudentModel.countDocuments(studentFilter).exec();

  if (!dryRun) {
    await ClassModel.updateMany(classFilter, {
      $set: { classroomCourseId: null },
    }).exec();
    await ExamModel.updateMany(examFilter, {
      $set: { courseWorkId: null },
    }).exec();
    await StudentModel.updateMany(studentFilter, {
      $set: { classroomUserId: null, classroomRemovedAt: null },
    }).exec();
  }

  console.log(`
═══════════ BACKFILL CLASSROOM FIELDS ═══════════
  turmas    sem classroomCourseId:   ${classes}
  provas    sem courseWorkId:        ${exams}
  alunos    sem campos classroom:    ${students}
  modo:                              ${dryRun ? "DRY-RUN (sem escrita)" : "escrita aplicada"}
═════════════════════════════════════════════════
  `);
}

main()
  .then(async () => {
    await disconnectMongo();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    process.exit(1);
  });
