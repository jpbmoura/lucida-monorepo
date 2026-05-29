import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { LessonPlan, LessonPlanContent } from "../domain/lesson-plan.js";
import type { DocxLessonPlanBuilder } from "../application/export-lesson-plan-docx.js";

const SEGMENT_LABELS: Record<LessonPlan["segment"], string> = {
  FUNDAMENTAL: "Ensino Fundamental",
  MEDIO: "Ensino Médio",
  FACULDADE: "Ensino Superior",
  INFOPRODUTOR: "Curso livre",
};

/**
 * Gera .docx do plano de aula (texto estruturado, sem branding pesado) pensado
 * pra o professor editar no Word. Espelha DocxExamBuilderImpl.
 */
export class DocxLessonPlanBuilderImpl implements DocxLessonPlanBuilder {
  async build(input: { plan: LessonPlan }): Promise<Buffer> {
    const { plan } = input;
    const c = plan.content;
    const id = plan.identification;
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: id.title, bold: true, size: 36 })],
      }),
    );

    // Linha de identificação.
    const idBits = [
      SEGMENT_LABELS[plan.segment],
      id.subject,
      id.level,
      id.durationMinutes > 0 ? `${id.durationMinutes} min` : null,
    ].filter(Boolean) as string[];
    if (idBits.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({ text: idBits.join("  •  "), italics: true, size: 22 }),
          ],
        }),
      );
    }

    pushList(children, "Objetivos de aprendizagem", c.objectives);
    pushBncc(children, c);
    pushText(children, "Conteúdo", c.content);
    pushText(children, "Metodologia", c.methodology);
    pushList(children, "Recursos", c.resources);
    pushText(children, "Introdução", c.introduction);
    pushText(children, "Desenvolvimento", c.development);
    pushText(children, "Conclusão", c.conclusion);
    pushText(children, "Avaliação", c.assessment);
    pushList(children, "Bibliografia", c.bibliography);

    const doc = new Document({
      creator: "Lucida",
      title: id.title,
      sections: [{ children }],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26 })],
  });
}

function pushText(out: Paragraph[], title: string, value: string): void {
  if (!value?.trim()) return;
  out.push(heading(title));
  // Quebra parágrafos por linha em branco.
  for (const block of value.split(/\n{2,}/)) {
    out.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: block.trim(), size: 22 })],
      }),
    );
  }
}

function pushList(out: Paragraph[], title: string, items: string[]): void {
  if (!items || items.length === 0) return;
  out.push(heading(title));
  for (const item of items) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text: item, size: 22 })],
      }),
    );
  }
}

function pushBncc(out: Paragraph[], c: LessonPlanContent): void {
  if (!c.bnccSkills || c.bnccSkills.length === 0) return;
  out.push(heading("Habilidades BNCC"));
  for (const skill of c.bnccSkills) {
    out.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${skill.code} `, bold: true, size: 22 }),
          new TextRun({ text: skill.description, size: 22 }),
        ],
      }),
    );
  }
}
