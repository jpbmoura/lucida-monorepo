import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import {
  AnalyticsSidebarNav,
  type AnalyticsSidebarNavItem,
} from "./sidebar-nav";

// MVP: só Dashboard funciona. O resto fica como "em breve" visível na
// sidebar pra mostrar o roadmap — quando implementarmos, é só remover
// o `disabled`.
const GERAL: AnalyticsSidebarNavItem[] = [
  { label: "Dashboard", href: "/analytics", icon: "layout" },
  { label: "Professores", href: "/analytics/professores", icon: "users" },
];

const FERRAMENTAS: AnalyticsSidebarNavItem[] = [
  { label: "Análises", href: "/analytics/analises", icon: "chart", disabled: true },
  { label: "Convidar professor", icon: "invite", disabled: true },
];

const CONTA: AnalyticsSidebarNavItem[] = [
  { label: "Desenvolvedores", href: "/analytics/desenvolvedores", icon: "code" },
  { label: "Configurações", href: "/analytics/configuracoes", icon: "settings" },
  { label: "Ajuda e suporte", href: "/analytics/ajuda", icon: "help" },
];

export function AnalyticsSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white p-5 lg:flex">
      <Link
        href="/analytics"
        aria-label="Ir para o dashboard da instituição"
        className="mb-6 flex items-center border-b border-gray-100 pb-6"
      >
        <Logo variant="analytics" priority className="h-7" />
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <SidebarSection label="Geral" items={GERAL} />
        <SidebarSection label="Ferramentas" items={FERRAMENTAS} />
        <SidebarSection label="Conta" items={CONTA} />
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  items,
}: {
  label: string;
  items: AnalyticsSidebarNavItem[];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </div>
      <AnalyticsSidebarNav items={items} />
    </div>
  );
}
