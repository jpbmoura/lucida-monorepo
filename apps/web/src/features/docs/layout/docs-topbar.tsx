import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DocsMobileNav } from "./mobile-nav";

/**
 * Topbar mobile — aparece abaixo de lg, onde a sidebar desktop fica
 * escondida. Contém o hamburger (que abre o `DocsMobileNav` drawer)
 * à esquerda e atalho pro dashboard à direita.
 */
export function DocsTopbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/80 px-3 py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-2">
        <DocsMobileNav />
        <Link
          href="/docs"
          aria-label="Documentação Lucida"
          className="flex items-center gap-2"
        >
          <Logo variant="analytics" priority className="h-6" />
          <span className="rounded-md bg-analytics-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-analytics-primary">
            docs
          </span>
        </Link>
      </div>

      <Link
        href="/analytics/desenvolvedores"
        className="text-xs font-medium text-gray-600 hover:text-ink"
      >
        Dashboard →
      </Link>
    </header>
  );
}
