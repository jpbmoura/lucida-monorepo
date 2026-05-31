import {
  AlignmentType,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Exam } from "../domain/exam.js";
import type { Question } from "../domain/question.js";
import type {
  DocxExamBuilder,
  ExamExportVersion,
} from "../application/export-exam-docx.js";

/**
 * Gera .docx cru (texto estruturado, sem branding) pensado pra professor
 * editar no Word antes de aplicar. Visual fica por conta dele.
 *
 * TODO(org-branding): quando existir Turma/Org com cabeçalho customizado
 * (logo, nome da escola), aceitar header opcional no build().
 */
export class DocxExamBuilderImpl implements DocxExamBuilder {
  async build(input: {
    exam: Exam;
    version: ExamExportVersion;
  }): Promise<Buffer> {
    const { exam, version } = input;
    const children: Paragraph[] = [];

    if (version === "student" || version === "both") {
      children.push(...renderStudentVersion(exam));
    }
    if (version === "both") {
      children.push(pageBreak());
    }
    if (version === "answer_key" || version === "both") {
      children.push(...renderAnswerKey(exam));
    }

    const doc = new Document({
      creator: "Lucida",
      title: exam.title,
      sections: [{ children }],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }
}

function renderStudentVersion(exam: Exam): Paragraph[] {
  const out: Paragraph[] = [];

  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: exam.title, bold: true, size: 36 })],
    }),
  );

  if (exam.description) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: exam.description, italics: true, size: 22 }),
        ],
      }),
    );
  }

  // Campos pro aluno preencher.
  out.push(blankField("Nome", 40));
  out.push(blankField("Turma", 20));
  out.push(blankField("Data", 15));

  if (exam.duration > 0) {
    out.push(
      new Paragraph({
        spacing: { before: 100, after: 300 },
        children: [
          new TextRun({
            text: `Duração: ${exam.duration} minutos`,
            size: 20,
            italics: true,
          }),
        ],
      }),
    );
  } else {
    out.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  exam.questions.forEach((q, i) => {
    out.push(...renderQuestion(q, i + 1));
  });

  return out;
}

function renderQuestion(q: Question, number: number): Paragraph[] {
  const out: Paragraph[] = [];

  if (q.context) {
    out.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({ text: q.context, size: 20, italics: true }),
        ],
      }),
    );
  }

  out.push(
    new Paragraph({
      spacing: { before: q.context ? 0 : 240, after: 120 },
      children: [
        new TextRun({ text: `${number}. `, bold: true, size: 24 }),
        new TextRun({ text: q.statement, size: 24 }),
      ],
    }),
  );

  if (q.type === "open") {
    // Discursiva: sem alternativas, linhas em branco pra resposta.
    for (let k = 0; k < 4; k++) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: "_".repeat(70), size: 22 })],
        }),
      );
    }
    return out;
  }

  q.options.forEach((opt, i) => {
    out.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${letterFor(i)}) `,
            bold: true,
            size: 22,
          }),
          new TextRun({ text: opt, size: 22 }),
        ],
      }),
    );
  });

  return out;
}

function renderAnswerKey(exam: Exam): Paragraph[] {
  const out: Paragraph[] = [];

  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "GABARITO", bold: true, size: 32 })],
    }),
  );

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({ text: exam.title, italics: true, size: 22 }),
      ],
    }),
  );

  exam.questions.forEach((q, i) => {
    if (q.type === "open") {
      out.push(...renderOpenAnswerKey(q, i + 1));
      return;
    }

    const letter = letterFor(q.correctAnswer);
    const correctOption = q.options[q.correctAnswer] ?? "";

    out.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 24 }),
          new TextRun({
            text: `Resposta: ${letter}) ${correctOption}`,
            bold: true,
            size: 22,
          }),
        ],
      }),
    );

    if (q.explanation) {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `Explicação: `,
              italics: true,
              size: 20,
            }),
            new TextRun({ text: q.explanation, size: 20 }),
          ],
        }),
      );
    }
  });

  return out;
}

// Gabarito da discursiva: resposta de referência + rubrica (critério → níveis).
function renderOpenAnswerKey(q: Question, number: number): Paragraph[] {
  const out: Paragraph[] = [];

  out.push(
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({ text: `${number}. `, bold: true, size: 24 }),
        new TextRun({ text: "Questão discursiva", bold: true, size: 22 }),
      ],
    }),
  );

  if (q.referenceAnswer) {
    out.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Resposta de referência: ", italics: true, size: 20 }),
          new TextRun({ text: q.referenceAnswer, size: 20 }),
        ],
      }),
    );
  }

  const rubric = q.rubric;
  if (rubric) {
    for (const c of rubric.criteria) {
      const max = Math.max(...c.levels.map((l) => l.points));
      out.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `• ${c.name} (até ${max} pts): `, bold: true, size: 20 }),
            new TextRun({
              text: c.levels.map((l) => `${l.label} (${l.points})`).join("; "),
              size: 20,
            }),
          ],
        }),
      );
    }
  }

  return out;
}

function blankField(label: string, underscores: number): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: "_".repeat(underscores), size: 22 }),
    ],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function letterFor(i: number): string {
  return String.fromCharCode(65 + i);
}
