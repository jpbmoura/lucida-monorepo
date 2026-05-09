import "server-only";
import { apiFetch } from "./api-client";

export interface AssistantTargetSummary {
  teacherUserId: string;
  teacherName: string | null;
  teacherEmail: string;
  /**
   * Dados do **próprio auxiliar** (real user). Usado no banner pra deixar
   * claro que ele está atuando em outra conta — "Você (X) está acessando
   * a conta de (Y)".
   */
  assistantName: string | null;
  assistantEmail: string;
}

export interface AssistantState {
  /** Quantos professores ativos esse user pode atender. 0 = não é auxiliar. */
  availableTeachers: number;
  /**
   * Resumo do professor que está sendo atendido AGORA (cookie válido).
   * Null = auxiliar logado mas sem cookie de target ainda.
   */
  activeTarget: AssistantTargetSummary | null;
  /**
   * Auxiliar optou explicitamente por usar a própria conta
   * (cookie carimbado com o próprio id). Usado pelo /app pra não
   * jogar de volta no seletor.
   */
  selfMode: boolean;
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
        assistantSelfMode?: boolean;
        id: string;
        name?: string;
        email: string;
        realUser?: {
          id: string;
          email: string;
          name?: string;
        } | null;
      };
    }>("/v1/me").catch(() => null),
  ]);

  let activeTarget: AssistantTargetSummary | null = null;
  if (me?.data.assistantMode && me.data.realUser) {
    // /v1/me em assistantMode devolve dados do EFFECTIVE user (professor)
    // no topo, e os dados do auxiliar real em `realUser`.
    activeTarget = {
      teacherUserId: me.data.id,
      teacherName: me.data.name ?? null,
      teacherEmail: me.data.email,
      assistantName: me.data.realUser.name ?? null,
      assistantEmail: me.data.realUser.email,
    };
  }

  return {
    availableTeachers: teachers.teachers.length,
    activeTarget,
    selfMode: me?.data.assistantSelfMode ?? false,
  };
}
