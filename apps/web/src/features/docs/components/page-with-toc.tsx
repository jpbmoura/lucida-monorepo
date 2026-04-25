import { cn } from "@/lib/utils";
import { DocsToc, type TocItem } from "./docs-toc";

interface PageWithTocProps {
  /** Itens do "Nesta página". Vazio ou undefined = sem TOC (layout 4xl centrado). */
  tocItems?: TocItem[];
  /** `gap` do flex-col interno. Default 10 (gap-10 = 40px). */
  gap?: 10 | 12;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper padrão pra páginas de /docs. Sem `tocItems`, renderiza
 * layout tradicional (max-w-4xl centrado). Com `tocItems`, vira grid
 * duas colunas em xl+ (conteúdo 3xl + TOC 220px fixo no lado direito).
 *
 * Páginas de docs que adicionam âncoras nos seus sections passam a
 * lista e ganham scroll spy sem mais boilerplate.
 */
export function PageWithToc({
  tocItems,
  gap = 10,
  children,
  className,
}: PageWithTocProps) {
  const hasToc = tocItems && tocItems.length > 0;
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div
        className={cn(
          "mx-auto grid w-full gap-10",
          hasToc ? "max-w-6xl xl:grid-cols-[1fr_220px]" : "max-w-4xl",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col",
            gap === 12 ? "gap-12" : "gap-10",
            hasToc && "xl:max-w-3xl",
            className,
          )}
        >
          {children}
        </div>
        {hasToc && <DocsToc items={tocItems} />}
      </div>
    </main>
  );
}
