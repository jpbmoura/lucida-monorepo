import type { HttpMethod } from "../components/method-badge";

/**
 * Item leaf — simples link sem filhos. Usado pra páginas como Quickstart,
 * Autenticação, Erros, e overviews de recurso (a página `Visão geral`
 * dentro de cada grupo).
 */
export interface DocsNavLeaf {
  kind: "leaf";
  label: string;
  href: string;
}

/**
 * Sub-rota REST dentro de um grupo de recurso (ex.: GET /classes dentro
 * de "Turmas"). Aparece com badge colorido do método na sidebar.
 */
export interface DocsNavRoute {
  kind: "route";
  method: HttpMethod;
  label: string;
  href: string;
}

/**
 * Sub-evento de webhook (ex.: submission.created dentro de "Submissões").
 * Renderizado em fonte mono pra reforçar que é um identificador.
 */
export interface DocsNavEvent {
  kind: "event";
  /** Identificador do evento, ex.: "submission.created". */
  event: string;
  href: string;
}

/**
 * Grupo colapsável que abriga rotas REST (ex.: "Turmas") OU eventos
 * (ex.: "Submissões"). Itens podem misturar leaf (overview) + routes/events.
 */
export interface DocsNavGroup {
  kind: "group";
  label: string;
  /** Path-prefix usado pra decidir se o grupo abre por padrão (rota
   * atual está dentro). Sem isso, o grupo só expande no clique. */
  basePath: string;
  items: Array<DocsNavLeaf | DocsNavRoute | DocsNavEvent>;
}

/**
 * `DocsNavEvent` aparece tanto dentro de groups quanto direto numa section
 * (caso só exista 1 evento — não justifica criar group colapsável).
 */
export type DocsNavItem = DocsNavLeaf | DocsNavGroup | DocsNavEvent;

export interface DocsNavSection {
  label: string;
  items: DocsNavItem[];
}

/**
 * Mapa único de navegação. Ordem aqui = ordem visual; alimenta sidebar
 * desktop e drawer mobile. Quando um endpoint REST ou evento novo é
 * adicionado, ele entra no `items` do grupo correspondente — sem mexer
 * em nenhum componente.
 */
export const DOCS_NAV_SECTIONS: DocsNavSection[] = [
  {
    label: "Geral",
    items: [
      { kind: "leaf", label: "Introdução", href: "/docs" },
      { kind: "leaf", label: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    label: "Fundamentos",
    items: [
      { kind: "leaf", label: "Autenticação", href: "/docs/autenticacao" },
      { kind: "leaf", label: "Erros", href: "/docs/erros" },
    ],
  },
  {
    label: "Referência da API",
    items: [
      {
        kind: "group",
        label: "Turmas",
        basePath: "/docs/api/turmas",
        items: [
          { kind: "leaf", label: "Visão geral", href: "/docs/api/turmas" },
          {
            kind: "route",
            method: "GET",
            label: "Listar turmas",
            href: "/docs/api/turmas/listar",
          },
          {
            kind: "route",
            method: "POST",
            label: "Criar turma",
            href: "/docs/api/turmas/criar",
          },
        ],
      },
      {
        kind: "group",
        label: "Alunos",
        basePath: "/docs/api/alunos",
        items: [
          { kind: "leaf", label: "Visão geral", href: "/docs/api/alunos" },
          {
            kind: "route",
            method: "GET",
            label: "Listar alunos",
            href: "/docs/api/alunos/listar",
          },
          {
            kind: "route",
            method: "POST",
            label: "Cadastrar alunos",
            href: "/docs/api/alunos/cadastrar",
          },
        ],
      },
      {
        kind: "group",
        label: "Provas",
        basePath: "/docs/api/provas",
        items: [
          { kind: "leaf", label: "Visão geral", href: "/docs/api/provas" },
          {
            kind: "route",
            method: "POST",
            label: "Gerar link da prova",
            href: "/docs/api/provas/gerar-link",
          },
        ],
      },
      {
        kind: "group",
        label: "Notas",
        basePath: "/docs/api/notas",
        items: [
          { kind: "leaf", label: "Visão geral", href: "/docs/api/notas" },
          {
            kind: "route",
            method: "GET",
            label: "Listar notas da prova",
            href: "/docs/api/notas/listar",
          },
        ],
      },
    ],
  },
  {
    label: "Webhooks",
    items: [
      { kind: "leaf", label: "Visão geral", href: "/docs/webhooks" },
      {
        kind: "event",
        event: "submission.completed",
        href: "/docs/webhooks/submission-completed",
      },
    ],
  },
];
