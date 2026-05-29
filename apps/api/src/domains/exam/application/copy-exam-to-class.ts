import { Exam } from "../domain/exam.js";
import { ExamId } from "../domain/exam-id.js";
import { ExamNotFoundError } from "../domain/exam-errors.js";
import type { ExamRepository } from "../domain/exam-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

export interface CopyExamToClassInput {
  sourceExamId: string;
  targetClassId: string;
  ownerId: string;
}

export interface CopyExamToClassOutput {
  id: string;
  shareId: string;
}

const TITLE_MAX = 200;
const COPY_SUFFIX = " (cópia)";

// Acrescenta " (cópia)" sem estourar o limite de 200 do domínio (que jogaria
// ExamTitleInvalidError). Se necessário, trunca o título original primeiro.
function copyTitle(original: string): string {
  const full = `${original}${COPY_SUFFIX}`;
  if (full.length <= TITLE_MAX) return full;
  return original.slice(0, TITLE_MAX - COPY_SUFFIX.length).trimEnd() + COPY_SUFFIX;
}

export class CopyExamToClassUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: CopyExamToClassInput): Promise<CopyExamToClassOutput> {
    const source = await this.exams.findById(ExamId.of(input.sourceExamId));
    if (!source || !source.isOwnedBy(input.ownerId)) {
      throw new ExamNotFoundError();
    }

    const target = await this.classes.findById(ClassId.of(input.targetClassId));
    if (!target || !target.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }

    // Questões são value objects imutáveis — reaproveitar as instâncias na nova
    // prova é seguro. Submissões não são tocadas (vivem em coleção própria,
    // chaveada pelo examId antigo).
    const exam = Exam.create({
      id: this.exams.nextId(),
      classId: target.id.toString(),
      courseId: target.courseId,
      ownerId: input.ownerId,
      title: copyTitle(source.title),
      description: source.description,
      style: source.style,
      duration: source.duration,
      securityLevel: source.securityLevel,
      questions: source.questions,
      shareId: this.exams.nextShareId(),
      usage: source.usage,
    });

    await this.exams.save(exam);
    return { id: exam.id.toString(), shareId: exam.shareId };
  }
}
