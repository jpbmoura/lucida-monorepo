import type { TeacherAssistant } from "./teacher-assistant.js";

export interface AssistantWithUser {
  id: string;
  teacherUserId: string;
  assistantUserId: string;
  assistantName: string | null;
  assistantEmail: string;
  organizationId: string;
  createdAt: Date;
  createdBy: string;
}

export interface TeacherWithMeta {
  /** Vínculo. */
  id: string;
  teacherUserId: string;
  teacherName: string | null;
  teacherEmail: string;
  organizationId: string;
  organizationName: string | null;
  createdAt: Date;
}

export interface TeacherAssistantRepository {
  nextId(): string;
  save(assistant: TeacherAssistant): Promise<void>;
  findById(id: string): Promise<TeacherAssistant | null>;

  /**
   * Lista vínculos ativos pra um professor específico — base do painel
   * de auxiliares no /analytics. Inclui dados do user auxiliar.
   */
  listAssistantsForTeacher(input: {
    teacherUserId: string;
    organizationId: string;
  }): Promise<AssistantWithUser[]>;

  /**
   * Lista professores aos quais um auxiliar está atualmente linkado
   * (vínculos não-revogados, professores ainda membros da org). Alimenta
   * o seletor `/auxiliar/escolher`.
   */
  listTeachersForAssistant(input: {
    assistantUserId: string;
  }): Promise<TeacherWithMeta[]>;

  /**
   * Lookup específico que o middleware `requireAuth` usa pra validar
   * o cookie `lucida.assistant_target`. Devolve o vínculo se existir e
   * estiver ativo; null caso contrário.
   */
  findActiveLink(input: {
    assistantUserId: string;
    teacherUserId: string;
  }): Promise<TeacherAssistant | null>;

  /**
   * Bate antes do create pra evitar dois vínculos ativos pro mesmo
   * (assistant, teacher).
   */
  existsActiveLink(input: {
    assistantUserId: string;
    teacherUserId: string;
  }): Promise<boolean>;

  /** Conta vínculos ativos do auxiliar (N:N). Útil pra UX do seletor. */
  countActiveTeachersForAssistant(assistantUserId: string): Promise<number>;
}
