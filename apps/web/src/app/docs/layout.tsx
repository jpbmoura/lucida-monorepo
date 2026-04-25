import type { Metadata } from "next";
import { DocsSidebar } from "@/features/docs/layout/sidebar";
import { DocsTopbar } from "@/features/docs/layout/docs-topbar";

/**
 * Shell público da documentação. Sem guard de sessão — qualquer pessoa
 * acessa. `theme-analytics` aplica a paleta roxa nos tokens semânticos
 * do shadcn (focus ring, seleção) sem interferir nos tokens do brand
 * Exam (azul). Pra voltar ao ambiente do produto, a sidebar tem o link
 * "Dashboard do dev" no rodapé.
 */
export const metadata: Metadata = {
  title: {
    default: "Documentação · Lucida API",
    template: "%s · Documentação Lucida",
  },
  description:
    "Referência e guias de integração da API institucional da Lucida. Autenticação, endpoints públicos e webhooks.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-analytics flex min-h-screen bg-white">
      <DocsSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DocsTopbar />
        {children}
      </div>
    </div>
  );
}
