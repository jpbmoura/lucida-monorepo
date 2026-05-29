import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SidebarNav, type SidebarNavItem } from "./sidebar-nav";
import { SidebarUpgradeCard } from "./sidebar-upgrade-card";

const GERAL: SidebarNavItem[] = [
  { label: "Dashboard", href: "/app", icon: "layout" },
  { label: "Cursos", href: "/app/cursos", icon: "folder" },
];

const FERRAMENTAS: SidebarNavItem[] = [
  // "Nova prova" não navega — abre dialog pra escolher a turma e daí vai
  // pro wizard. Ver NewExamSidebarRow + NewExamDialog.
  { label: "Nova prova", action: "new-exam", icon: "file" },
  // "Scanner" também não navega — abre dialog pra escolher turma → prova
  // e daí vai pra /app/provas/:id/scanner.
  { label: "Scanner", action: "scanner", icon: "scan" },
  { label: "Análises", href: "/app/analises", icon: "chart" },
  { label: "Nova Aula", icon: "book", disabled: true },
  { label: "Novo Slide", icon: "presentation", disabled: true },
];

const CONTA: SidebarNavItem[] = [
  {
    label: "Ajuda e suporte",
    href: "/app/ajuda",
    icon: "help",
  },
];

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
