/**
 * Catálogo fechado de etiquetas. Adicionar/remover passa por deploy —
 * isso é proposital pra evitar bagunça (mesmo conceito com nomes
 * diferentes). A cor não é validada no domain; é metadata pro frontend.
 */
export interface TagDefinition {
  id: string;
  label: string;
  /** Cor semântica usada no frontend pra badge/pill. */
  color: "red" | "amber" | "emerald" | "blue" | "purple" | "pink" | "gray" | "indigo";
}

export const CARD_TAGS: Record<string, TagDefinition> = {
  bug: { id: "bug", label: "Bug", color: "red" },
  produto: { id: "produto", label: "Produto", color: "blue" },
  comercial: { id: "comercial", label: "Comercial", color: "amber" },
  suporte: { id: "suporte", label: "Suporte", color: "purple" },
  ops: { id: "ops", label: "Operações", color: "gray" },
  conteudo: { id: "conteudo", label: "Conteúdo", color: "pink" },
  ia: { id: "ia", label: "IA", color: "indigo" },
  urgente: { id: "urgente", label: "Urgente", color: "red" },
};

export type CardTagId = keyof typeof CARD_TAGS;

export function isCardTagId(value: string): value is CardTagId {
  return value in CARD_TAGS;
}

export const CARD_TAG_LIST: TagDefinition[] = Object.values(CARD_TAGS);
