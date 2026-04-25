import JSZip from "jszip";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import { StudentModel } from "@/domains/student/infrastructure/student-schema.js";
import { SubmissionModel } from "@/domains/submission/infrastructure/submission-schema.js";
import type { OrganizationMembersRepository } from "./ports/organization-members-repository.js";
import { TeacherNotInOrganizationError } from "./compute-teacher-overview.js";

interface Input {
  organizationId: string;
  teacherId: string;
}

export interface ExportTeacherDataResult {
  /** ZIP completo em bytes. */
  zip: Uint8Array;
  /** Nome sugerido pro arquivo — controller seta `Content-Disposition`. */
  filename: string;
}

/**
 * Monta ZIP com 4 CSVs descrevendo tudo que o professor tem:
 *   - turmas.csv
 *   - alunos.csv
 *   - provas.csv
 *   - submissoes.csv
 *
 * Valida que o teacherId é member da org ativa (mesma regra do
 * ComputeTeacherOverviewUseCase). Sem paginação — assume conjunto que cabe
 * em memória; aceitável enquanto professor médio tem <500 alunos e <100
 * provas. Se escalar, migramos pra streaming.
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

    const [allClasses, allExams, studentDocs, submissionDocs] =
      await Promise.all([
        this.classes.findByOwner(input.teacherId),
        this.exams.findByOwnerId(input.teacherId),
        StudentModel.find({ ownerId: input.teacherId }).lean().exec(),
        SubmissionModel.find({ ownerId: input.teacherId }).lean().exec(),
      ]);

    const classNameById = new Map(
      allClasses.map((c) => [c.id.toString(), c.name]),
    );
    const examTitleById = new Map(allExams.map((e) => [e.id.toString(), e.title]));

    // ─── CSVs ───
    const turmasCsv = buildCsv(
      ["id", "nome", "descricao", "criada_em", "atualizada_em"],
      allClasses.map((c) => [
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
      allExams.map((e) => [
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
        sub.status,
        String(sub.score ?? ""),
        String(sub.correctCount ?? ""),
        String(sub.questionCount ?? ""),
        sub.submittedAt ? sub.submittedAt.toISOString() : "",
      ]),
    );

    const readme = buildReadme(teacher.name, {
      classes: allClasses.length,
      exams: allExams.length,
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

    const slug = slugify(teacher.name) || "professor";
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      zip: zipBytes,
      filename: `lucida-${slug}-${stamp}.zip`,
    };
  }
}

// ───── helpers ──────────────────────────────────────────────

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
  return [
    `Exportação de dados — Lucida Analytics`,
    ``,
    `Professor: ${teacherName}`,
    `Gerado em: ${when}`,
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
  ].join("\r\n");
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
