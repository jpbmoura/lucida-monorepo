"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUpgradeCard } from "./sidebar-upgrade-card";
import { GERAL, FERRAMENTAS, CONTA } from "./nav-items";

/**
 * Drawer de navegação do app do professor em telas pequenas — espelha o padrão
 * de docs/layout/mobile-nav.tsx. Reusa exatamente a mesma navegação da sidebar
 * desktop (nav-items.ts + SidebarNav), incluindo as ações "Nova prova" e
 * "Scanner" que abrem dialogs. Fecha sozinho ao navegar (`pathname` effect).
 *
 * O trigger (hamburger) só aparece em < lg — a sidebar desktop assume acima.
 */
export function AppMobileNav({
  hasActiveSubscription,
}: {
  hasActiveSubscription: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir navegação"
          className="inline-flex size-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="safe-top w-[280px] gap-0 p-0"
      >
        <SheetTitle className="sr-only">Navegação</SheetTitle>

        <Link
          href="/app"
          aria-label="Ir para o dashboard"
          className="flex items-center border-b border-gray-100 px-5 py-4"
        >
          <Logo priority className="h-7" />
        </Link>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
          <Section label="Geral" items={GERAL} />
          <Section label="Ferramentas" items={FERRAMENTAS} />
          <Section label="Conta" items={CONTA} />
        </div>

        <div className="p-3">
          <SidebarUpgradeCard hasActiveSubscription={hasActiveSubscription} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  label,
  items,
}: {
  label: string;
  items: React.ComponentProps<typeof SidebarNav>["items"];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </div>
      <SidebarNav items={items} />
    </div>
  );
}
