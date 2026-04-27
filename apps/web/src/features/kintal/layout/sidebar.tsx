import Link from "next/link";
import { KintalLogo } from "@/features/kintal/components/kintal-logo";
import {
  KintalSidebarNav,
  type KintalSidebarNavItem,
} from "./sidebar-nav";

// Itens "soltos" — sem header de grupo, posicionados no topo da sidebar.
// Dashboard e Roadmap ficam fora dos grupos por serem páginas de uso
// frequente e independentes de qualquer área (financeiro/comercial/etc.).
const SOLO: KintalSidebarNavItem[] = [
  { label: "Dashboard", href: "/kintal", icon: "layout" },
  { label: "Roadmap", href: "/roadmap", icon: "map" },
];

const FINANCEIRO: KintalSidebarNavItem[] = [
  { label: "Assinaturas", icon: "money", disabled: true },
  { label: "Compras avulsas", icon: "money", disabled: true },
  { label: "MRR", icon: "money", disabled: true },
  { label: "Extrato", icon: "money", disabled: true },
];

const COMERCIAL: KintalSidebarNavItem[] = [
  { label: "Funil", icon: "commercial", disabled: true },
  { label: "Leads", icon: "commercial", disabled: true },
  { label: "Conversões", icon: "commercial", disabled: true },
];

const ATENDIMENTO: KintalSidebarNavItem[] = [
  { label: "Notificações", href: "/kintal/notifications", icon: "bell" },
  { label: "Tickets", icon: "support", disabled: true },
  { label: "Feedbacks", icon: "support", disabled: true },
];

const OPERACOES: KintalSidebarNavItem[] = [
  { label: "Board", href: "/kintal/board", icon: "board" },
  { label: "Usuários", href: "/kintal/usuarios", icon: "users" },
  { label: "Exames", icon: "ops", disabled: true },
  { label: "Integrações", icon: "ops", disabled: true },
];

const ADMINISTRACAO: KintalSidebarNavItem[] = [
  { label: "Acessos", href: "/kintal/acessos", icon: "shield" },
];

export function KintalSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white p-5 lg:flex">
      <Link
        href="/kintal"
        aria-label="Ir para o dashboard do Kintal"
        className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-6"
      >
        <KintalLogo variant="symbol" className="h-6 w-auto" />
        <span className="text-base font-medium tracking-tight text-ink">
          Kintal
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <KintalSidebarNav items={SOLO} />
        <Section label="Financeiro" items={FINANCEIRO} />
        <Section label="Comercial" items={COMERCIAL} />
        <Section label="Atendimento" items={ATENDIMENTO} />
        <Section label="Operações" items={OPERACOES} />
        <Section label="Administração" items={ADMINISTRACAO} />
      </div>
    </aside>
  );
}

function Section({
  label,
  items,
}: {
  label: string;
  items: KintalSidebarNavItem[];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </div>
      <KintalSidebarNav items={items} />
    </div>
  );
}
