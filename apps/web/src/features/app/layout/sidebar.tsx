import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SidebarNav, type SidebarNavItem } from "./sidebar-nav";
import { SidebarUpgradeCard } from "./sidebar-upgrade-card";
import { GERAL, FERRAMENTAS, CONTA } from "./nav-items";

export function Sidebar({
  hasActiveSubscription,
}: {
  hasActiveSubscription: boolean;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white p-5 lg:flex">
      <Link
        href="/app"
        aria-label="Ir para o dashboard"
        className="mb-6 flex items-center border-b border-gray-100 pb-6"
      >
        <Logo priority className="h-7" />
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <SidebarSection label="Geral" items={GERAL} />
        <SidebarSection label="Ferramentas" items={FERRAMENTAS} />
        <SidebarSection label="Conta" items={CONTA} />
      </div>

      <SidebarUpgradeCard hasActiveSubscription={hasActiveSubscription} />
    </aside>
  );
}

function SidebarSection({
  label,
  items,
}: {
  label: string;
  items: SidebarNavItem[];
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
