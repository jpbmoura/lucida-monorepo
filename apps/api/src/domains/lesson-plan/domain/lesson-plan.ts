import { LessonPlanId } from "./lesson-plan-id.js";
import { LessonPlanTitleInvalidError } from "./lesson-plan-errors.js";

const TITLE_MIN = 2;
const TITLE_MAX = 200;

// Os 4 segmentos. Espelha o tipo do ai-ops, mas o domínio de persistência é
// independente (não importa nada de ai-ops).
export type LessonPlanSegment =
  | "FUNDAMENTAL"
  | "MEDIO"
  | "FACULDADE"
  | "INFOPRODUTOR";

export type LessonPlanStatus = "DRAFT" | "READY" | "ARCHIVED";

export interface BnccSkill {
  code: string;
  description: string;
}

export interface LessonPlanIdentification {
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  date: Date | null;
}

// Os blocos do plano (brief seção 4). Mantidos juntos pra mutar em bloco.
export interface LessonPlanContent {
  objectives: string[];
  bnccSkills: BnccSkill[];
  bnccVerified: boolean;
  content: string;
  methodology: string;
  resources: string[];
  introduction: string;
  development: string;
  conclusion: string;
  assessment: string;
  bibliography: string[];
}

export interface LessonPlanUsage {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface LessonPlanProps {
  id: LessonPlanId;
  classId: string;
  /** Snapshot de `class.courseId` (como faz o Exam). */
  courseId: string;
  ownerId: string;
  organizationId: string | null;
  segment: LessonPlanSegment;
  status: LessonPlanStatus;
  identification: LessonPlanIdentification;
  content: LessonPlanContent;
  /** Uploads usados como insumo na geração (referência informativa). */
  sourceMaterialIds: string[];
  /** Handoff: prova gerada a partir deste plano. */
  generatedExamId: string | null;
  /** Handoff futuro (módulo Learning). */
  generatedMaterialId: string | null;
  usage: LessonPlanUsage | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LessonPlan {
  private constructor(private props: LessonPlanProps) {}

  static create(input: {
    id: LessonPlanId;
    classId: string;
    courseId: string;
    ownerId: string;
    organizationId?: string | null;
    segment: LessonPlanSegment;
    status?: LessonPlanStatus;
    identification: LessonPlanIdentification;
    content: LessonPlanContent;
    sourceMaterialIds?: string[];
    generatedExamId?: string | null;
    generatedMaterialId?: string | null;
    usage?: LessonPlanUsage | null;
    now?: Date;
  }): LessonPlan {
    const now = input.now ?? new Date();
    return new LessonPlan({
      id: input.id,
      classId: input.classId,
      courseId: input.courseId,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      segment: input.segment,
      status: input.status ?? "DRAFT",
      identification: {
        ...input.identification,
        title: validateTitle(input.identification.title),
      },
      content: input.content,
      sourceMaterialIds: input.sourceMaterialIds ?? [],
      generatedExamId: input.generatedExamId ?? null,
      generatedMaterialId: input.generatedMaterialId ?? null,
      usage: input.usage ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: LessonPlanProps): LessonPlan {
    return new LessonPlan({ ...props });
  }

  get id(): LessonPlanId {
    return this.props.id;
  }
  get classId(): string {
    return this.props.classId;
  }
  get courseId(): string {
    return this.props.courseId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get segment(): LessonPlanSegment {
    return this.props.segment;
  }
  get status(): LessonPlanStatus {
    return this.props.status;
  }
  get identification(): LessonPlanIdentification {
    return { ...this.props.identification };
  }
  get content(): LessonPlanContent {
    return { ...this.props.content };
  }
  get sourceMaterialIds(): string[] {
    return [...this.props.sourceMaterialIds];
  }
  get generatedExamId(): string | null {
    return this.props.generatedExamId;
  }
  get generatedMaterialId(): string | null {
    return this.props.generatedMaterialId;
  }
  get usage(): LessonPlanUsage | null {
    return this.props.usage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get title(): string {
    return this.props.identification.title;
  }

  updateIdentification(
    next: Partial<LessonPlanIdentification>,
    now: Date = new Date(),
  ): void {
    const merged = { ...this.props.identification, ...next };
    this.props.identification = {
      ...merged,
      title: validateTitle(merged.title),
    };
    this.props.updatedAt = now;
  }

  replaceContent(content: LessonPlanContent, now: Date = new Date()): void {
    this.props.content = content;
    this.props.updatedAt = now;
  }

  setStatus(status: LessonPlanStatus, now: Date = new Date()): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  linkGeneratedExam(examId: string, now: Date = new Date()): void {
    this.props.generatedExamId = examId;
    this.props.updatedAt = now;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateTitle(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < TITLE_MIN) {
    throw new LessonPlanTitleInvalidError(
      `Título precisa ter ao menos ${TITLE_MIN} caracteres.`,
    );
  }
  if (trimmed.length > TITLE_MAX) {
    throw new LessonPlanTitleInvalidError(
      `Título não pode passar de ${TITLE_MAX} caracteres.`,
    );
  }
  return trimmed;
}
