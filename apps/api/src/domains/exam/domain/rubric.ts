import { ExamQuestionsInvalidError } from "./exam-errors.js";

export interface RubricLevelData {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface RubricCriterionData {
  id: string;
  name: string;
  description?: string | null;
  levels: RubricLevelData[];
}

export interface RubricData {
  criteria: RubricCriterionData[];
}

/**
 * Rubrica = CRITÉRIOS × NÍVEIS. Cada nível tem pontos definidos.
 *
 * A nota da questão discursiva é SOMADA dos níveis escolhidos por critério —
 * nunca um número holístico inventado. Isso a torna auditável e editável.
 *
 * IDs (`id`) de critério e nível são estáveis: sobrevivem à edição do professor.
 * A correção (manual ou IA) referencia por id, não por posição.
 */
export class Rubric {
  private constructor(private readonly props: RubricData) {}

  static create(input: RubricData): Rubric {
    validate(input);
    return new Rubric({
      criteria: input.criteria.map((c) => ({
        id: c.id.trim(),
        name: c.name.trim(),
        description: c.description?.trim() || null,
        levels: c.levels.map((l) => ({
          id: l.id.trim(),
          label: l.label.trim(),
          points: l.points,
          descriptor: l.descriptor?.trim() ?? "",
        })),
      })),
    });
  }

  get criteria(): RubricCriterionData[] {
    return this.props.criteria.map((c) => ({
      ...c,
      levels: c.levels.map((l) => ({ ...l })),
    }));
  }

  /** Soma dos pontos do maior nível de cada critério. */
  maxPoints(): number {
    return this.props.criteria.reduce(
      (sum, c) => sum + Math.max(...c.levels.map((l) => l.points)),
      0,
    );
  }

  /**
   * Pontos obtidos dado o nível escolhido por critério
   * (`Map<criterionId, levelId>`). Critério sem seleção (ou com nível
   * inexistente) conta 0. Sempre SOMADA — auditável.
   */
  scoreFor(selections: Map<string, string>): number {
    let total = 0;
    for (const c of this.props.criteria) {
      const levelId = selections.get(c.id);
      if (!levelId) continue;
      const level = c.levels.find((l) => l.id === levelId);
      if (level) total += level.points;
    }
    return total;
  }

  toJSON(): RubricData {
    return { criteria: this.criteria };
  }
}

function validate(input: RubricData): void {
  if (!input.criteria || input.criteria.length < 1) {
    throw new ExamQuestionsInvalidError("Rubrica precisa de ao menos 1 critério.");
  }
  const criterionIds = new Set<string>();
  for (const c of input.criteria) {
    const cid = c.id?.trim();
    if (!cid) throw new ExamQuestionsInvalidError("Critério da rubrica sem id.");
    if (criterionIds.has(cid)) {
      throw new ExamQuestionsInvalidError("IDs de critério duplicados na rubrica.");
    }
    criterionIds.add(cid);
    if (!c.name?.trim()) {
      throw new ExamQuestionsInvalidError("Critério da rubrica sem nome.");
    }
    if (!c.levels || c.levels.length < 2) {
      throw new ExamQuestionsInvalidError("Cada critério precisa de ao menos 2 níveis.");
    }
    const levelIds = new Set<string>();
    for (const l of c.levels) {
      const lid = l.id?.trim();
      if (!lid) throw new ExamQuestionsInvalidError("Nível da rubrica sem id.");
      if (levelIds.has(lid)) {
        throw new ExamQuestionsInvalidError("IDs de nível duplicados num critério.");
      }
      levelIds.add(lid);
      if (!l.label?.trim()) {
        throw new ExamQuestionsInvalidError("Nível da rubrica sem rótulo.");
      }
      if (!Number.isFinite(l.points) || l.points < 0) {
        throw new ExamQuestionsInvalidError("Pontos do nível devem ser ≥ 0.");
      }
    }
  }
}
