import JSZip from "jszip";
import type { FilterQuery } from "mongoose";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import {
  StudentModel,
  type StudentDoc,
} from "@/domains/student/infrastructure/student-schema.js";
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
  classIds?: string[];
  examIds?: string[];
  /** Default 'all' — sem filtro de status. */
  status?: "submitted" | "in_progress" | "all";
}

interface Input {
  organizationId: string;
  teacherId: string;
  filters?: ExportTeacherFilters;
}

export interface ExportTeacherDataResult {
  /** ZIP completo em bytes. */
  zip: Uint8Array;
  /** Nome sugerido pro arquivo — controller seta `Content-Disposition`. */
  filename: string;
}

/**
 * Monta ZIP com 4 CSVs descrevendo o que o professor tem:
 *   - turmas.csv
 *   - alunos.csv
 *   - provas.csv
 *   - submissoes.csv
 *
 * Filtros aplicam em cascata. Primeiro busca submissões que casam (date
 * range em `submittedAt`, classIds, examIds, status), depois deriva exam,
 * class e student ids e busca só esses. Resultado: os 4 CSVs ficam
 * coerentes entre si — quem aparece em submissoes.csv aparece em
 * alunos.csv, e idem pra prova/turma.
 *
 * Quando o usuário passa `from`/`to`, submissões sem `submittedAt`
 * (status `in_progress`) ficam de fora pelo filtro de data. Aceitável: o
 * range é sobre quando a prova foi entregue, não quando começou.
 *
 * Valida que o teacherId é member da org ativa — evita vazamento quando
 * alguém tenta exportar um userId arbitrário.
 */
export class ExportTeacherDataUseCase {
  constructor(
    private readonly members: OrganizationMembersRepository,
    private readonly classes: ClassRepository,
    private readonly exams: ExamRepository,
  ) {}

  async execute(input: Input): Promise<ExportTeacherDataResult> {
    const orgMembers = await this.members.listMembers(input.organizationId);
    const teacher = orgMembers.find((m) => m.userId === input.teacherId);
    if (!teacher) {
      throw new TeacherNotInOrganizationError();
    }

    const filters = normalizeFilters(input.filters);

    // 1. Submissões com filtros aplicados — sempre travadas em ownerId.
    const submissionDocs = await SubmissionModel.find(
      buildSubmissionQuery(input.teacherId, filters),
    )
      .lean()
      .exec();

    // 2. Deriva ids relacionados pra cascatear as outras coleções.
    const examIdSet = new Set<string>();
    const classIdSet = new Set<string>();
    const studentIdSet = new Set<string>();
    for (const sub of submissionDocs) {
      examIdSet.add(sub.examId);
      classIdSet.add(sub.classId);
      if (sub.studentId) studentIdSet.add(sub.studentId);
    }

    // 3. Busca turmas, provas e alunos limitados ao recorte. Mantém o
    // travamento por ownerId — defesa em profundidade caso algum id
    // vazasse de outra origem.
    const [allClassesOwned, allExamsOwned, studentDocs] = await Promise.all([
      this.classes.findByOwner(input.teacherId),
      this.exams.findByOwnerId(input.teacherId),
      studentIdSet.size > 0
        ? StudentModel.find({
            ownerId: input.teacherId,
            _id: { $in: [...studentIdSet] },
          })
            .lean()
            .exec()
        : Promise.resolve([] as StudentDoc[]),
    ]);

    const filteredClasses = allClassesOwned.filter((c) =>
      classIdSet.has(c.id.toString()),
    );
    const filteredExams = allExamsOwned.filter((e) =>
      examIdSet.has(e.id.toString()),
    );

    const classNameById = new Map(
      allClassesOwned.map((c) => [c.id.toString(), c.name]),
    );
    const examTitleById = new Map(
      allExamsOwned.map((e) => [e.id.toString(), e.title]),
    );
    const studentEmailById = new Map(
      studentDocs.map((s) => [s._id, s.email ?? ""]),
    );

    // ─── CSVs ───
    const turmasCsv = buildCsv(
      ["id", "nome", "descricao", "criada_em", "atualizada_em"],
      filteredClasses.map((c) => [
        c.id.toString(),
        c.name,
        c.description ?? "",
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ]),
    );

    const alunosCsv = buildCsv(
      [
        "id",
        "nome",
        "codigo",
        "matricula",
        "email",
        "turma_id",
        "turma_nome",
        "criado_em",
      ],
      studentDocs.map((s) => [
        s._id,
        s.name,
        s.code,
        s.matricula,
        s.email ?? "",
        s.classId,
        classNameById.get(s.classId) ?? "",
        s.createdAt.toISOString(),
      ]),
    );

    const provasCsv = buildCsv(
      [
        "id",
        "titulo",
        "descricao",
        "turma_id",
        "turma_nome",
        "qtd_questoes",
        "duracao_min",
        "criada_em",
        "atualizada_em",
      ],
      filteredExams.map((e) => [
        e.id.toString(),
        e.title,
        e.description ?? "",
        e.classId,
        classNameById.get(e.classId) ?? "",
        String(e.questions.length),
        String(e.duration),
        e.createdAt.toISOString(),
        e.updatedAt.toISOString(),
      ]),
    );

    const submissoesCsv = buildCsv(
      [
        "id",
        "prova_id",
        "prova_titulo",
        "turma_id",
        "turma_nome",
        "aluno_id",
        "aluno_nome",
        "aluno_codigo",
        "aluno_email",
        "status",
        "score",
        "corretas",
        "total_questoes",
        "submetida_em",
      ],
      submissionDocs.map((sub) => [
        sub._id,
        sub.examId,
        examTitleById.get(sub.examId) ?? "",
        sub.classId,
        classNameById.get(sub.classId) ?? "",
        sub.studentId ?? "",
        sub.studentName ?? "",
        sub.studentCode ?? "",
        studentEmailById.get(sub.studentId ?? "") ?? "",
        sub.status,
        String(sub.score ?? ""),
        String(sub.correctCount ?? ""),
        String(sub.questionCount ?? ""),
        sub.submittedAt ? sub.submittedAt.toISOString() : "",
      ]),
    );

    const readme = buildReadme(teacher.name, filters, {
      classes: filteredClasses.length,
      exams: filteredExams.length,
      students: studentDocs.length,
      submissions: submissionDocs.length,
    });

    // ─── ZIP ───
    const zip = new JSZip();
    zip.file("README.txt", readme);
    zip.file("turmas.csv", turmasCsv);
    zip.file("alunos.csv", alunosCsv);
    zip.file("provas.csv", provasCsv);
    zip.file("submissoes.csv", submissoesCsv);

    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    return {
      zip: zipBytes,
      filename: buildFilename(teacher.name, filters),
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

interface NormalizedFilters {
  from: Date | null;
  to: Date | null;
  classIds: string[] | null;
  examIds: string[] | null;
  status: "submitted" | "in_progress" | "all";
}

/**
 * Normaliza datas pra UTC: `from` zera horas (início do dia), `to` vai pro
 * último ms do dia. Garante range inclusivo quando o usuário passa só a
 * data (sem hora) no formato `yyyy-mm-dd`.
 */
function normalizeFilters(
  raw: ExportTeacherFilters | undefined,
): NormalizedFilters {
  const from = raw?.from ? startOfDayUTC(raw.from) : null;
  const to = raw?.to ? endOfDayUTC(raw.to) : null;
  const classIds =
    raw?.classIds && raw.classIds.length > 0 ? [...raw.classIds] : null;
  const examIds =
    raw?.examIds && raw.examIds.length > 0 ? [...raw.examIds] : null;
  const status = raw?.status ?? "all";
  return { from, to, classIds, examIds, status };
}

function buildSubmissionQuery(
  teacherId: string,
  filters: NormalizedFilters,
): FilterQuery<SubmissionDoc> {
  const query: FilterQuery<SubmissionDoc> = { ownerId: teacherId };
  if (filters.status !== "all") query.status = filters.status;
  if (filters.classIds) query.classId = { $in: filters.classIds };
  if (filters.examIds) query.examId = { $in: filters.examIds };
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
 * aspas ou quebra de linha; aspas internas são duplicadas. Não usamos lib
 * pra evitar dep nova — escopo aqui é controlado e o formato bem pequeno.
 */
function buildCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string): string => {
    if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) {
    lines.push(row.map((c) => esc(c ?? "")).join(","));
  }
  // CRLF per RFC 4180 — mais compatível com Excel/BR.
  return lines.join("\r\n");
}

function buildReadme(
  teacherName: string,
  filters: NormalizedFilters,
  counts: {
    classes: number;
    exams: number;
    students: number;
    submissions: number;
  },
): string {
  const when = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const lines = [
    `Exportação de dados — Lucida Analytics`,
    ``,
    `Professor: ${teacherName}`,
    `Gerado em: ${when}`,
    ``,
    `Filtros aplicados:`,
    ...formatFiltersForReadme(filters),
    ``,
    `Arquivos neste pacote:`,
    `  turmas.csv      — ${counts.classes} registro(s)`,
    `  alunos.csv      — ${counts.students} registro(s)`,
    `  provas.csv      — ${counts.exams} registro(s)`,
    `  submissoes.csv  — ${counts.submissions} registro(s)`,
    ``,
    `Codificação: UTF-8. Separador: vírgula (,). Linhas: CRLF.`,
    `Campos com vírgula/quebra são envolvidos em aspas duplas (RFC 4180).`,
    ``,
    `Abra no Excel: Dados → Obter dados → De arquivo → De texto/CSV.`,
    `No Google Planilhas: Arquivo → Importar → Upload → escolher o CSV.`,
  ];
  return lines.join("\r\n");
}

function formatFiltersForReadme(filters: NormalizedFilters): string[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const items: string[] = [];
  if (filters.from || filters.to) {
    const from = filters.from ? fmt.format(filters.from) : "início";
    const to = filters.to ? fmt.format(filters.to) : "hoje";
    items.push(`  Período (data de submissão): ${from} → ${to}`);
  }
  if (filters.classIds) {
    items.push(`  Turmas: ${filters.classIds.length} selecionada(s)`);
  }
  if (filters.examIds) {
    items.push(`  Provas: ${filters.examIds.length} selecionada(s)`);
  }
  if (filters.status !== "all") {
    items.push(
      `  Status: ${filters.status === "submitted" ? "Finalizadas" : "Em andamento"}`,
    );
  }
  if (items.length === 0) {
    items.push(`  (nenhum — exportação completa do professor)`);
  }
  return items;
}

function buildFilename(
  teacherName: string,
  filters: NormalizedFilters,
): string {
  const slug = slugify(teacherName) || "professor";
  const stamp = new Date().toISOString().slice(0, 10);
  const range = filenameRange(filters);
  return `lucida-${slug}-${stamp}${range}.zip`;
}

function filenameRange(filters: NormalizedFilters): string {
  if (!filters.from && !filters.to) return "";
  const from = filters.from ? filters.from.toISOString().slice(0, 10) : "inicio";
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
