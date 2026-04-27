// Produto ao qual a feature pertence. Um item carrega exatamente um produto —
// se uma feature acabar valendo pra ambos, vira dois itens (decisão do
// time, não do modelo).
export const ROADMAP_PRODUCTS = ["exam", "analytics"] as const;
export type RoadmapProduct = (typeof ROADMAP_PRODUCTS)[number];

// Estágio do item no funil. `suggested` é a "lista de sugestões da
// comunidade"; os outros 4 formam o kanban curado; `declined` é arquivado
// (visível em acordeão).
export const ROADMAP_STAGES = [
  "suggested",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
] as const;
export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

// De onde veio o item. `community` foi sugerido por user logado; `staff`
// foi criado direto no Kintal. Source não muda mesmo se staff promove uma
// sugestão pro kanban — preserva o histórico.
export const ROADMAP_SOURCES = ["community", "staff"] as const;
export type RoadmapSource = (typeof ROADMAP_SOURCES)[number];

// Estado de moderação. Hoje sugestões nascem `auto_approved` (config #1 do
// produto). O campo já existe pra trocar pra fila de moderação no futuro
// sem alterar schema: bastará trocar o default e filtrar por `approved`
// na listagem pública.
export const ROADMAP_MODERATION_STATUSES = [
  "auto_approved",
  "pending",
  "approved",
  "rejected",
] as const;
export type RoadmapModerationStatus =
  (typeof ROADMAP_MODERATION_STATUSES)[number];

/**
 * Estágios em que o staff cria um item direto (não-comunitário). Bloqueia
 * `suggested` (esse só pode entrar via fluxo de sugestão) e `declined`
 * (declined só faz sentido como transição, não como criação).
 */
export const STAFF_CREATABLE_STAGES: readonly RoadmapStage[] = [
  "under_review",
  "planned",
  "in_progress",
  "shipped",
] as const;
