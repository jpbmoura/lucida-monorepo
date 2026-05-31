import type { LessonPlan } from "@/domains/lesson-plan/domain/lesson-plan.js";

// Renderiza um plano de aula como texto-fonte pra geração de slides. Quando o
// deck nasce de um plano, o backend carrega a entidade (fonte de verdade) e a
// transforma neste texto — não passa por extractor. Mantém ai-ops desacoplado
// do schema de persistência do plano (depende só dos getters do domínio).
export function renderLessonPlanAsText(plan: LessonPlan): string {
  const id = plan.identification;
  const c = plan.content;
  const parts: string[] = [];

  parts.push(`# ${id.title}`);
  if (id.subject) parts.push(`Disciplina: ${id.subject}`);
  if (id.level) parts.push(`Nível: ${id.level}`);
  if (id.durationMinutes) parts.push(`Duração: ${id.durationMinutes} minutos`);

  const section = (heading: string, body: string) => {
    if (body.trim()) parts.push(`\n## ${heading}\n${body.trim()}`);
  };
  const list = (heading: string, items: string[]) => {
    const clean = items.map((i) => i.trim()).filter(Boolean);
    if (clean.length) parts.push(`\n## ${heading}\n${clean.map((i) => `- ${i}`).join("\n")}`);
  };

  list("Objetivos de aprendizagem", c.objectives);
  if (c.bnccSkills.length) {
    list(
      "Habilidades BNCC",
      c.bnccSkills.map((s) => `${s.code}: ${s.description}`),
    );
  }
  section("Conteúdo", c.content);
  section("Metodologia", c.methodology);
  list("Recursos", c.resources);
  section("Introdução", c.introduction);
  section("Desenvolvimento", c.development);
  section("Conclusão", c.conclusion);
  section("Avaliação", c.assessment);
  list("Bibliografia", c.bibliography);

  return parts.join("\n");
}
