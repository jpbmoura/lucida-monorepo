import "server-only";
import { apiFetch } from "./api-client";

export interface AssistantTargetSummary {
  teacherUserId: string;
  teacherName: string | null;
  teacherEmail: string;
}

export interface AssistantState {
  /** Quantos professores ativos esse user pode atender. 0 = não é auxiliar. */
  availableTeachers: number;
  /**
   * Resumo do professor que está sendo atendido AGORA (cookie válido).
   * Null = auxiliar logado mas sem cookie de target ainda.
   */
  activeTarget: AssistantTargetSummary | null;
}

/**
 * Resolve duas perguntas em uma chamada combinada:
 *  1. Quantos professores esse user pode atender? (consulta `/v1/iam/assistant/teachers`)
 *  2. Tem target ativo? (consulta `/v1/me` que devolve `assistantMode + realUser`)
 *
 * Layout do /app usa pra (a) redirecionar pro /auxiliar/escolher quando
 * preciso e (b) montar o banner.
 */
export async function fetchAssistantState(): Promise<AssistantState> {
  const [teachers, me] = await Promise.all([
    apiFetch<{
      teachers: Array<{
        teacherUserId: string;
        teacherName: string | null;
        teacherEmail: string;
      }>;
    }>("/v1/iam/assistant/teachers").catch(() => ({ teachers: [] })),
    apiFetch<{
      data: {
        assistantMode?: boolean;
        id: string;
        name?: string;
        email: string;
      };
    }>("/v1/me").catch(() => null),
  ]);

  let activeTarget: AssistantTargetSummary | null = null;
  if (me?.data.assistantMode) {
    // /v1/me em assistantMode devolve dados do EFFECTIVE user (professor).
    activeTarget = {
      teacherUserId: me.data.id,
      teacherName: me.data.name ?? null,
      teacherEmail: me.data.email,
    };
  }

  return {
    availableTeachers: teachers.teachers.length,
    activeTarget,
  };
}
