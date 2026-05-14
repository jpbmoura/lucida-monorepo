import type { FilterQuery } from "mongoose";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { CourseRepository } from "@/domains/course/domain/course-repository.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";
import {
  SubmissionModel,
  type SubmissionDoc,
} from "@/domains/submission/infrastructure/submission-schema.js";
import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";
import { TeacherNotInOrganizationError } from "./compute-teacher-overview.js";

export interface ExportTeacherFilters {
  /** `submittedAt >= from` (inclusivo, normalizado pro início do dia UTC). */
  from?: Date;
  /** `submittedAt <= to` (inclusivo, normalizado pro fim do dia UTC). */
  to?: Date;
}

interface Input {
  organizationId: string;
  teacherId: string;
  filters?: ExportTeacherFilters;
}

export interface ExportTeacherDataResult {
  /** Conteúdo do CSV (UTF-8, com BOM no início — controller envia direto). */
  csv: string;
  /** Nome sugerido pro arquivo. */
  filename: string;
}

/**
 * Gera UM CSV com todas as submissões finalizadas do professor no
 * período. Cada linha = uma submissão; um aluno que respondeu N provas
 * aparece em N linhas.
 *
 * Regras:
 *  - Só `status: "submitted"`. Provas em andamento nunca entram.
 *  - Filtro de data atua em `submittedAt`. Sem datas = exporta tudo.
 *  - Cobre TODAS as turmas e provas do professor sem exceção — não há
 *    recorte por turma/prova. `ownerId = teacherId` é o único critério
 *    de escopo. Era tentador deixar o usuário selecionar turmas/provas
 *    na UI, mas a lista vinha capada/filtrada pelo overview e o botão
 *    "Selecionar tudo" não cobria tudo de verdade, ocultando submissões.
 *
 * As coleções de turmas, alunos, provas e cursos são lidas só pra
 * enriquecer colunas do CSV.
 */
export class ExportTeacherDataUseCase {
  constructor(
    private readonly members: OrganizationMembersRepository,
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
    private readonly courses: CourseRepository,
  ) {}

  async execute(input: Input): Promise<ExportTeacherDataResult> {
    const orgMembers = await this.members.listMembers(input.organizationId);
    const teacher = orgMembers.find((m) => m.userId === input.teacherId);
    if (!teacher) {
      throw new TeacherNotInOrganizationError();
    }

    const filters = normalizeFilters(input.filters);

    // 1. Submissões finalizadas que casam com os filtros, ordenadas por
    // data desc (mais recentes primeiro — leitura humana natural).
    const submissionDocs = await SubmissionModel.find(
      buildSubmissionQuery(input.teacherId, filters),
    )
      .sort({ submittedAt: -1 })
      .lean()
      .exec();

    // 2. Lookups paralelos pra enriquecer as colunas. Buscamos as
    // coleções inteiras do professor pra construir maps O(1) — barato e
    // simplifica o código. Se o conjunto crescer demais, dá pra otimizar
    // pra buscar só os ids referenciados.
    const studentIds = [
      ...new Set(submissionDocs.map((s) => s.studentId).filter(Boolean)),
    ];

    const [classes, exams, courses, students] = await Promise.all([
      this.classes.findByOwner(input.teacherId),
      this.exams.findByOwnerId(input.teacherId),
      this.courses.findByOwner(input.teacherId),
      studentIds.length > 0
        ? StudentModel.find({
            ownerId: input.teacherId,
            _id: { $in: studentIds },
          })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const classById = new Map(classes.map((c) => [c.id.toString(), c]));
    const examTitleById = new Map(
      exams.map((e) => [e.id.toString(), e.title]),
    );
    const courseNameById = new Map(
      courses.map((c) => [c.id.toString(), c.name]),
    );
    const studentById = new Map(students.map((s) => [s._id, s]));

    // 3. Monta CSV.
    const headers = [
      "submetida_em",
      "aluno_nome",
      "aluno_email",
      "aluno_codigo",
      "aluno_matricula",
      "prova_titulo",
      "turma_nome",
      "curso_nome",
      "status",
      "score",
      "corretas",
      "total_questoes",
      "percentual_acerto",
    ];

    const rows = submissionDocs.map((sub) => {
      const cls = classById.get(sub.classId);
      const courseName = cls ? courseNameById.get(cls.courseId) ?? "" : "";
      const student = studentById.get(sub.studentId ?? "");
      const percent =
        sub.questionCount > 0
          ? Math.round((sub.correctCount / sub.questionCount) * 1000) / 10
          : 0;
      return [
        formatBR(sub.submittedAt),
        sub.studentName ?? "",
        student?.email ?? "",
        sub.studentCode ?? "",
        student?.matricula ?? "",
        examTitleById.get(sub.examId) ?? "",
        cls?.name ?? "",
        courseName,
        sub.status,
        formatDecimalBR(sub.score),
        String(sub.correctCount ?? 0),
        String(sub.questionCount ?? 0),
        `${formatDecimalBR(percent)}%`,
      ];
    });

    // BOM UTF-8 + CRLF garantem que o Excel (especialmente em pt-BR)
    // abra com acentuação correta e linhas separadas direito.
    const csv = "﻿" + buildCsv(headers, rows);

    return {
      csv,
      filename: buildFilename(teacher.name, filters),
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

interface NormalizedFilters {
  from: Date | null;
  to: Date | null;
}

function normalizeFilters(
  raw: ExportTeacherFilters | undefined,
): NormalizedFilters {
  return {
    from: raw?.from ? startOfDayUTC(raw.from) : null,
    to: raw?.to ? endOfDayUTC(raw.to) : null,
  };
}

function buildSubmissionQuery(
  teacherId: string,
  filters: NormalizedFilters,
): FilterQuery<SubmissionDoc> {
  const query: FilterQuery<SubmissionDoc> = {
    ownerId: teacherId,
    status: "submitted",
  };
  if (filters.from || filters.to) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    query.submittedAt = range;
  }
  return query;
}

function startOfDayUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfDayUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

/**
 * CSV minimalista — RFC 4180. Aspas envolvem campos que tenham vírgula,
 * aspas ou quebra de linha; aspas internas são duplicadas. CRLF como
 * separador. Sem libs — escopo controlado.
 */
function buildCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string): string => {
    if (
      v.includes(",") ||
      v.includes('"') ||
      v.includes("\n") ||
      v.includes("\r")
    ) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) {
    lines.push(row.map((c) => esc(c ?? "")).join(","));
  }
  return lines.join("\r\n");
}

/** `submittedAt` no formato `dd/MM/yyyy HH:mm` em America/Sao_Paulo. */
function formatBR(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** Mantém vírgula decimal pt-BR; Excel/BR interpreta direto. */
function formatDecimalBR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toString().replace(".", ",");
}

function buildFilename(
  teacherName: string,
  filters: NormalizedFilters,
): string {
  const slug = slugify(teacherName) || "professor";
  const stamp = new Date().toISOString().slice(0, 10);
  const range = filenameRange(filters);
  return `lucida-submissoes-${slug}-${stamp}${range}.csv`;
}

function filenameRange(filters: NormalizedFilters): string {
  if (!filters.from && !filters.to) return "";
  const from = filters.from
    ? filters.from.toISOString().slice(0, 10)
    : "inicio";
  const to = filters.to ? filters.to.toISOString().slice(0, 10) : "hoje";
  return `-${from}_${to}`;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
