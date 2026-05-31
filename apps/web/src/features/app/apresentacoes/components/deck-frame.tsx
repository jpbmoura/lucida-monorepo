import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SlideTheme } from "../types";
import { THEME_CLASS } from "../themes";
import { deckFontVars } from "../themes/fonts";

// Aplica o bundle de tokens do tema + as fontes do deck num container. Trocar o
// tema = trocar a classe, sem tocar no conteúdo. Envolve SlideCanvas no editor,
// no modo apresentar e na impressão.
export function DeckFrame({
  theme,
  className,
  children,
}: {
  theme: SlideTheme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(THEME_CLASS[theme], deckFontVars, className)}>
      {children}
    </div>
  );
}
