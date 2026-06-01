/**
 * Resultado de uma reconciliação de alunos (import inicial ou re-sync).
 * Vira o resumo "3 importados, 28 já existiam, 1 saiu" na UI.
 */
export interface ReconciliationReport {
  /** Alunos novos criados na Lucida (email não existia na turma). */
  imported: number;
  /** Alunos que já existiam (mesmo email) — nome atualizado se mudou. */
  alreadyExisted: number;
  /** Alunos marcados como saídos do Classroom (não apagados). */
  departed: number;
  /**
   * Alunos do Classroom sem email visível — não dá pra casar. Reportado
   * pra dar transparência (não é erro fatal).
   */
  skippedNoEmail: number;
}

export function emptyReconciliationReport(): ReconciliationReport {
  return { imported: 0, alreadyExisted: 0, departed: 0, skippedNoEmail: 0 };
}
