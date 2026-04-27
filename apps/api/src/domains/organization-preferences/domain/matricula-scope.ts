/**
 * Onde a "matrícula" do aluno é única dentro do sistema. Decide se duas
 * pessoas diferentes podem ter a mesma matrícula em professores diferentes
 * da mesma instituição.
 *
 * - "teacher" (default): matrícula única por professor. Modo histórico —
 *   funciona pra contas individuais (professor sem org) e pra orgs que
 *   funcionam como marketplaces (cada professor tem seu próprio "espaço"
 *   de matrículas, sem cruzamento).
 *
 * - "organization": matrícula única na organização inteira. Modo
 *   institucional — escolas/universidades onde a matrícula é o id
 *   institucional do aluno (ex.: RA, RM) e não pode repetir entre
 *   turmas de professores diferentes.
 *
 * Decisão consciente do admin da org. Mudar o scope no meio do uso pode
 * deixar matrículas legadas em estado inconsistente — o use case de
 * mudança de scope precisa validar antes (não implementado nesta fase).
 */
export const MATRICULA_SCOPES = ["teacher", "organization"] as const;
export type MatriculaScope = (typeof MATRICULA_SCOPES)[number];

export const DEFAULT_MATRICULA_SCOPE: MatriculaScope = "teacher";
