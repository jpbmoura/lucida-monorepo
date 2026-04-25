import type { DocsNavSection } from "./sidebar-nav";

/**
 * Mapa único de navegação — a ordem aqui é a ordem visual. A mesma
 * lista alimenta o sidebar desktop e o drawer mobile, garantindo
 * sincronia entre os dois sem duplicação.
 */
export const DOCS_NAV_SECTIONS: DocsNavSection[] = [
  {
    label: "Geral",
    items: [
      { label: "Introdução", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    label: "Fundamentos",
    items: [
      { label: "Autenticação", href: "/docs/autenticacao" },
      { label: "Erros", href: "/docs/erros" },
    ],
  },
  {
    label: "Referência da API",
    items: [{ label: "Turmas", href: "/docs/api/turmas" }],
  },
  {
    label: "Eventos",
    items: [{ label: "Webhooks", href: "/docs/webhooks" }],
  },
];
