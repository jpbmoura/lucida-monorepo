import type { MigrationContext } from "./context.js";
import { LEGACY } from "../legacy-collection-map.js";

export interface SanityReport {
  legacyCounts: Record<string, number>;
  targetCounts: Record<string, number>;
  orphans: {
    examsWithoutUser: number;
    submissionsWithoutStudent: number;
    scansWithoutExam: number;
  };
}

export async function runSanityChecks(
  ctx: MigrationContext,
): Promise<SanityReport> {
  const [
    legacyUsers,
    legacyClasses,
    legacyExams,
    legacyStudents,
    legacyResults,
    legacyScans,
    targetUsers,
    targetClasses,
    targetExams,
    targetStudents,
    targetSubs,
    targetScans,
  ] = await Promise.all([
    ctx.sourceDb.collection(LEGACY.users).countDocuments(),
    ctx.sourceDb.collection(LEGACY.classes).countDocuments(),
    ctx.sourceDb.collection(LEGACY.exams).countDocuments(),
    ctx.sourceDb.collection(LEGACY.students).countDocuments(),
    ctx.sourceDb.collection(LEGACY.results).countDocuments(),
    ctx.sourceDb.collection(LEGACY.scanresults).countDocuments(),
    ctx.targetDb.collection("user").countDocuments(),
    ctx.targetDb.collection("classes").countDocuments(),
    ctx.targetDb.collection("exams").countDocuments(),
    ctx.targetDb.collection("students").countDocuments(),
    ctx.targetDb.collection("submissions").countDocuments(),
    ctx.targetDb.collection("scan_results").countDocuments(),
  ]);

  const userIds = await ctx.targetDb
    .collection("user")
    .find({}, { projection: { _id: 1 } })
    .map((d) => String(d._id))
    .toArray();
  const userIdSet = new Set(userIds);

  const studentIds = await ctx.targetDb
    .collection("students")
    .find({}, { projection: { _id: 1 } })
    .map((d) => String(d._id))
    .toArray();
  const studentIdSet = new Set(studentIds);

  const examIds = await ctx.targetDb
    .collection("exams")
    .find({}, { projection: { _id: 1 } })
    .map((d) => String(d._id))
    .toArray();
  const examIdSet = new Set(examIds);

  const examsWithoutUser = await ctx.targetDb
    .collection<{ ownerId: string }>("exams")
    .find({ ownerId: { $nin: Array.from(userIdSet) } })
    .count();

  const subsWithoutStudent = await ctx.targetDb
    .collection<{ studentId: string }>("submissions")
    .find({ studentId: { $nin: Array.from(studentIdSet) } })
    .count();

  const scansWithoutExam = await ctx.targetDb
    .collection<{ examId: string }>("scan_results")
    .find({ examId: { $nin: Array.from(examIdSet) } })
    .count();

  return {
    legacyCounts: {
      [LEGACY.users]: legacyUsers,
      [LEGACY.classes]: legacyClasses,
      [LEGACY.exams]: legacyExams,
      [LEGACY.students]: legacyStudents,
      [LEGACY.results]: legacyResults,
      [LEGACY.scanresults]: legacyScans,
    },
    targetCounts: {
      user: targetUsers,
      classes: targetClasses,
      exams: targetExams,
      students: targetStudents,
      submissions: targetSubs,
      scan_results: targetScans,
    },
    orphans: {
      examsWithoutUser,
      submissionsWithoutStudent: subsWithoutStudent,
      scansWithoutExam,
    },
  };
}
