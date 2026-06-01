/**
 * Projeção de leitura de um aluno no roster do Google Classroom (recurso
 * `courses.students`). O casamento de identidade com a Lucida é por EMAIL.
 */
export interface ClassroomRosterStudent {
  /** userId do aluno no Classroom — guardado em `student.classroomUserId`. */
  classroomUserId: string;
  /** Nome completo (profile.name.fullName). */
  name: string;
  /**
   * Email do aluno. Pode vir `null` se o escopo `profile.emails` não foi
   * concedido ou a conta não expõe — aluno sem email não casa (sinalizado
   * no resumo).
   */
  email: string | null;
}
