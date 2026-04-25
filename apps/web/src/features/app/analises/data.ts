import "server-only";
import { apiFetch } from "@/lib/api-client";

export type OverviewPeriod = "7d" | "30d" | "90d" | "all";

export interface OverviewDTO {
  period: OverviewPeriod;
  periodStart: string | null;
  generatedAt: string;
  summary: {
    examsCreated: number;
    submissionsReceived: number;
    averageScore: number | null;
    questionsGraded: number;
    estimatedTimeSavedSeconds: number;
  };
  activity: Array<{
    date: string;
    submissions: number;
    averageScore: number | null;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  lowPerformanceExams: Array<{
    examId: string;
    title: string;
    classId: string;
    className: string;
    submissionsCount: number;
    averageScore: number;
  }>;
  classesRanking: Array<{
    classId: string;
    className: string;
    studentCount: number;
    submissionsInPeriod: number;
    averageScore: number | null;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    classId: string;
    className: string;
    lastScore: number;
    lastExamTitle: string;
    lastSubmittedAt: string;
  }>;
}

export async function fetchOverview(
  period: OverviewPeriod,
): Promise<OverviewDTO> {
  const res = await apiFetch<{ data: OverviewDTO }>(
    `/v1/analytics/overview?period=${period}`,
  );
  return res.data;
}

// ───── compartilhado entre drill-downs ──────────────────────

export type DifficultyKey = "fácil" | "médio" | "difícil";

export interface DifficultyStat {
  difficulty: DifficultyKey;
  totalQuestions: number;
  correctCount: number;
  accuracy: number | null;
}

export interface ScoreBucket {
  range: string;
  count: number;
}

// ───── class ────────────────────────────────────────────────

export interface ClassOverviewDTO {
  class: {
    id: string;
    name: string;
    description: string;
    studentCount: number;
  };
  period: OverviewPeriod;
  periodStart: string | null;
  generatedAt: string;
  summary: {
    examCount: number;
    submissionsReceived: number;
    averageScore: number | null;
    passRate: number | null;
  };
  trend: Array<{
    examId: string;
    title: string;
    appliedAt: string;
    submissionsCount: number;
    averageScore: number;
  }>;
  scoreDistribution: ScoreBucket[];
  exams: Array<{
    examId: string;
    title: string;
    createdAt: string;
    questionCount: number;
    submissionsCount: number;
    averageScore: number | null;
    passRate: number | null;
  }>;
  studentRanking: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    examsTaken: number;
    averageScore: number;
  }>;
  difficultyBreakdown: DifficultyStat[];
}

export async function fetchClassOverview(
  classId: string,
  period: OverviewPeriod,
): Promise<ClassOverviewDTO> {
  const res = await apiFetch<{ data: ClassOverviewDTO }>(
    `/v1/analytics/classes/${encodeURIComponent(classId)}?period=${period}`,
  );
  return res.data;
}

// ───── student ──────────────────────────────────────────────

export interface StudentOverviewDTO {
  student: {
    id: string;
    name: string;
    code: string;
    matricula: string;
    email: string | null;
    classId: string;
    className: string;
  };
  generatedAt: string;
  summary: {
    examsTaken: number;
    examsAvailable: number;
    averageScore: number | null;
    rankPosition: number | null;
    rankTotal: number;
    attendanceRate: number | null;
  };
  trend: Array<{
    examId: string;
    title: string;
    submittedAt: string;
    studentScore: number;
    classAverageScore: number;
  }>;
  exams: Array<{
    examId: string;
    title: string;
    submittedAt: string;
    source: "online" | "scanner";
    studentScore: number;
    correctCount: number;
    questionCount: number;
    classAverageScore: number;
  }>;
  difficultyBreakdown: Array<
    DifficultyStat & { classAccuracy: number | null }
  >;
}

export async function fetchStudentOverview(
  studentId: string,
): Promise<StudentOverviewDTO> {
  const res = await apiFetch<{ data: StudentOverviewDTO }>(
    `/v1/analytics/students/${encodeURIComponent(studentId)}`,
  );
  return res.data;
}

// ───── exam ─────────────────────────────────────────────────

export interface ExamOverviewDTO {
  exam: {
    id: string;
    title: string;
    description: string;
    classId: string;
    className: string;
    questionCount: number;
    duration: number;
    securityLevel: "off" | "strict";
  };
  generatedAt: string;
  summary: {
    submissionsCount: number;
    averageScore: number | null;
    minScore: number | null;
    maxScore: number | null;
    passRate: number | null;
    averageDurationSeconds: number | null;
  };
  scoreDistribution: ScoreBucket[];
  perQuestion: Array<{
    questionNumber: number;
    difficulty: DifficultyKey;
    statement: string;
    correctCount: number;
    totalAnswered: number;
    accuracy: number;
  }>;
  difficultyBreakdown: DifficultyStat[];
  studentRanking: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    source: "online" | "scanner";
    score: number;
    correctCount: number;
    submittedAt: string;
  }>;
  sourceBreakdown: {
    online: number;
    scanner: number;
  };
  integrityBreakdown: {
    clean: number;
    withViolations: number;
    terminatedByViolation: number;
  };
}

export async function fetchExamOverview(
  examId: string,
): Promise<ExamOverviewDTO> {
  const res = await apiFetch<{ data: ExamOverviewDTO }>(
    `/v1/analytics/exams/${encodeURIComponent(examId)}`,
  );
  return res.data;
}
