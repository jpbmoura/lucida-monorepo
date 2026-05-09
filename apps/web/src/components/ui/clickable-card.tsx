import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AllowedElement = "article" | "li" | "div" | "tr";

interface ClickableCardProps extends React.HTMLAttributes<HTMLElement> {
  href: string;
  ariaLabel: string;
  as?: AllowedElement;
  /** Renderizado dentro do mesmo Link absoluto pra que tooltips do navegador
   *  e abrir-em-nova-aba funcionem em qualquer ponto do card. */
  prefetch?: boolean;
}

/**
 * Card/linha 100% clicável via "stretched link".
 *
 * O Link fica em `absolute inset-0 z-0` cobrindo toda a área. Conteúdo
 * decorativo (texto, ícones, badges) deve ficar SEM `position: relative` ou
 * com `pointer-events-none` — caso contrário, captura o clique antes do Link.
 * Elementos interativos (menus, botões) devem ser embrulhados em
 * `<ClickableCardActions>` (relative + z-10 + pointer-events-auto).
 */
export function ClickableCard({
  href,
  ariaLabel,
  as = "article",
  prefetch,
  className,
  children,
  ...rest
}: ClickableCardProps) {
  const Element = as as React.ElementType;
  return (
    <Element className={cn("group relative", className)} {...rest}>
      <Link
        href={href}
        aria-label={ariaLabel}
        prefetch={prefetch}
        className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      />
      {children}
    </Element>
  );
}

/**
 * Slot pra elementos interativos dentro de um `ClickableCard` (botões, menus,
 * dropdowns). Garante que o clique vá pro botão, não pra navegação do card.
 */
export function ClickableCardActions({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative z-10", className)} {...rest}>
      {children}
    </div>
  );
}
