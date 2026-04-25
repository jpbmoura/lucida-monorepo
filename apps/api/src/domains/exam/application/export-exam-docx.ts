import { ExamId } from "../domain/exam-id.js";
import { ExamNotFoundError } from "../domain/exam-errors.js";
import type { Exam } from "../domain/exam.js";
import type { ExamRepository } from "../domain/exam-repository.js";

export type ExamExportVersion = "student" | "answer_key" | "both";

/**
 * Gera um buffer binário com a prova formatada.
 * A implementação (DOCX, no nosso caso) fica em infrastructure — o use case
 * só orquestra: valida posse + delega pro builder injetado.
 */
export interface DocxExamBuilder {
  build(input: { exam: Exam; version: ExamExportVersion }): Promise<Buffer>;
}

interface Input {
  examId: string;
  ownerId: string;
  version: ExamExportVersion;
}

export interface ExportExamDocxOutput {
  fileName: string;
  buffer: Buffer;
}

export class ExportExamDocxUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly builder: DocxExamBuilder,
  ) {}

  async execute(input: Input): Promise<ExportExamDocxOutput> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) {
      throw new ExamNotFoundError();
    }
    const buffer = await this.builder.build({
      exam,
      version: input.version,
    });
    return {
      fileName: buildFileName(exam.title, input.version),
      buffer,
    };
  }
}

function buildFileName(title: string, version: ExamExportVersion): string {
  const slug =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "prova";
  const suffix =
    version === "student"
      ? ""
      : version === "answer_key"
        ? "-gabarito"
        : "-com-gabarito";
  return `${slug}${suffix}.docx`;
}
