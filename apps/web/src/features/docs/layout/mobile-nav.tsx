"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { DocsSidebarNav } from "./sidebar-nav";
import { DOCS_NAV_SECTIONS } from "./nav-sections";

/**
 * Drawer mobile com a navegação completa das docs. Fecha automaticamente
 * ao navegar — comportamento esperado em qualquer menu mobile. O
 * `open` é controlado pra que o `pathname`-effect possa resetar.
 *
 * Aparece apenas em viewports `< lg` (a aside desktop se mostra acima).
 */
export function DocsMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer quando o usuário navega (click num link interno).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir navegação"
          className="inline-flex size-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex max-w-[300px] flex-col gap-0 p-0"
      >
        <div className="flex items-center border-b border-gray-100 px-5 py-4">
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

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5">
          <DocsSidebarNav sections={DOCS_NAV_SECTIONS} />
        </div>

        <div className="border-t border-gray-100 p-4">
          <Link
            href="/analytics/desenvolvedores"
            className="inline-flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-gray-50"
          >
            Dashboard do dev
            <ArrowUpRight className="size-3.5 text-gray-400" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
