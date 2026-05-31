import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type {
  PendingGradingRow,
  SubmissionRepository,
} from "../domain/submission-repository.js";
import type { GradingStatus } from "../domain/submission.js";

interface Input {
  ownerId: string;
}

export interface GradingQueueSubmission {
  submissionId: string;
  studentName: string;
  studentCode: string;
  score: number;
  submittedAt: string;
  gradingStatus: GradingStatus;
  hasAiDraft: boolean;
}

export interface GradingQueueExam {
  examId: string;
  examTitle: string;
  pendingCount: number;
  aiDraftCount: number;
  submissions: GradingQueueSubmission[];
}

export interface GradingQueueClass {
  classId: string;
  className: string;
  pendingCount: number;
  exams: GradingQueueExam[];
}

export interface GradingQueueCourse {
  /** null = provas sem curso ("Sem curso"). */
  courseId: string | null;
  courseName: string;
  pendingCount: number;
  classes: GradingQueueClass[];
}

export interface GradingQueueOutput {
  totalSubmissions: number;
  totalExams: number;
  courses: GradingQueueCourse[];
}

const NO_COURSE_KEY = "__no_course__";

/**
 * Monta a fila de correção da tela "Corrigir Provas": todas as submissões do
 * professor com discursivas aguardando correção, agrupadas por Curso → Turma →
 * Prova. Resolve os nomes a partir das listagens do próprio owner (sem métodos
 * novos nos repos de exam/class/course).
 */
export class ListGradingQueueUseCase {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
    private readonly courses: CourseRepository,
  ) {}

  async execute(input: Input): Promise<GradingQueueOutput> {
    const rows = await this.submissions.findPendingGradingByOwner(input.ownerId);
    if (rows.length === 0) {
      return { totalSubmissions: 0, totalExams: 0, courses: [] };
    }

    const [exams, classes, courses] = await Promise.all([
      this.exams.findByOwnerId(input.ownerId),
      this.classes.findByOwner(input.ownerId),
      this.courses.findByOwner(input.ownerId),
    ]);

    const examTitleById = new Map(
      exams.map((e) => [e.id.toString(), e.title]),
    );
    const classNameById = new Map(
      classes.map((c) => [c.id.toString(), c.name]),
    );
    const courseNameById = new Map(
      courses.map((c) => [c.id.toString(), c.name]),
    );

    return groupRows(rows, { examTitleById, classNameById, courseNameById });
  }
}

interface NameMaps {
  examTitleById: Map<string, string>;
  classNameById: Map<string, string>;
  courseNameById: Map<string, string>;
}

function groupRows(
  rows: PendingGradingRow[],
  maps: NameMaps,
): GradingQueueOutput {
  // Estruturas intermediárias com acumuladores + ordem de inserção preservada.
  const courseOrder: string[] = [];
  const courseMap = new Map<
    string,
    {
      courseId: string | null;
      courseName: string;
      classOrder: string[];
      classMap: Map<
        string,
        {
          classId: string;
          className: string;
          examOrder: string[];
          examMap: Map<string, GradingQueueExam>;
        }
      >;
    }
  >();

  const examIds = new Set<string>();

  for (const row of rows) {
    const courseKey = row.courseId ? row.courseId : NO_COURSE_KEY;
    let course = courseMap.get(courseKey);
    if (!course) {
      course = {
        courseId: row.courseId ? row.courseId : null,
        courseName: row.courseId
          ? maps.courseNameById.get(row.courseId) ?? "Curso removido"
          : "Sem curso",
        classOrder: [],
        classMap: new Map(),
      };
      courseMap.set(courseKey, course);
      courseOrder.push(courseKey);
    }

    let cls = course.classMap.get(row.classId);
    if (!cls) {
      cls = {
        classId: row.classId,
        className: maps.classNameById.get(row.classId) ?? "Turma removida",
        examOrder: [],
        examMap: new Map(),
      };
      course.classMap.set(row.classId, cls);
      course.classOrder.push(row.classId);
    }

    let exam = cls.examMap.get(row.examId);
    if (!exam) {
      exam = {
        examId: row.examId,
        examTitle: maps.examTitleById.get(row.examId) ?? "Prova removida",
        pendingCount: 0,
        aiDraftCount: 0,
        submissions: [],
      };
      cls.examMap.set(row.examId, exam);
      cls.examOrder.push(row.examId);
      examIds.add(row.examId);
    }

    exam.submissions.push({
      submissionId: row.submissionId,
      studentName: row.studentName,
      studentCode: row.studentCode,
      score: row.score,
      submittedAt: row.submittedAt.toISOString(),
      gradingStatus: row.gradingStatus,
      hasAiDraft: row.hasAiDraft,
    });
    exam.pendingCount += 1;
    if (row.hasAiDraft) exam.aiDraftCount += 1;
  }

  const outCourses: GradingQueueCourse[] = courseOrder.map((ck) => {
    const course = courseMap.get(ck)!;
    const outClasses: GradingQueueClass[] = course.classOrder.map((clsId) => {
      const cls = course.classMap.get(clsId)!;
      const outExams = cls.examOrder.map((eid) => cls.examMap.get(eid)!);
      const pendingCount = outExams.reduce((s, e) => s + e.pendingCount, 0);
      return {
        classId: cls.classId,
        className: cls.className,
        pendingCount,
        exams: outExams,
      };
    });
    const pendingCount = outClasses.reduce((s, c) => s + c.pendingCount, 0);
    return {
      courseId: course.courseId,
      courseName: course.courseName,
      pendingCount,
      classes: outClasses,
    };
  });

  return {
    totalSubmissions: rows.length,
    totalExams: examIds.size,
    courses: outCourses,
  };
}
