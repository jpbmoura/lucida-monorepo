/**
 * Projeção de leitura de uma turma do Google Classroom (recurso `courses`).
 * Só os campos que a Lucida usa. Não é entidade persistida — vem da API a
 * cada listagem.
 */
export interface ClassroomCourse {
  /** Id do curso no Classroom (vira `class.classroomCourseId` ao importar). */
  id: string;
  name: string;
  /** Turma/seção (ex.: "3º A"). Pode vir vazio. */
  section: string | null;
  /** Disciplina, quando o professor preencheu. */
  descriptionHeading: string | null;
  /** Estado do curso no Classroom — listamos só ACTIVE na v1. */
  courseState: string;
  /** Quantidade de alunos no roster, se a API devolveu. */
  enrollmentCode: string | null;
}
