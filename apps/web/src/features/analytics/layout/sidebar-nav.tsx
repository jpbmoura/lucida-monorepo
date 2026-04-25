"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  BarChart3,
  UserPlus,
  Settings,
  HelpCircle,
  Code2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icons resolvidos no client — server components não conseguem passar
// componentes React via props (não serializam).
const ICONS = {
  layout: LayoutGrid,
  users: Users,
  chart: BarChart3,
  invite: UserPlus,
  settings: Settings,
  help: HelpCircle,
  code: Code2,
} as const;

export type AnalyticsSidebarIcon = keyof typeof ICONS;

export interface AnalyticsSidebarNavItem {
  label: string;
  icon: AnalyticsSidebarIcon;
  href?: string;
  disabled?: boolean;
}

interface SidebarNavProps {
  items: AnalyticsSidebarNavItem[];
}

export function AnalyticsSidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.href ? matchRoute(pathname, item.href) : false;
        return (
          <NavRow
            key={item.href ?? `disabled:${item.label}`}
            item={item}
            active={isActive}
            Icon={ICONS[item.icon]}
          />
        );
      })}
    </nav>
  );
}

function matchRoute(pathname: string, href: string): boolean {
  if (href === "/analytics") return pathname === "/analytics";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  active,
  Icon,
}: {
  item: AnalyticsSidebarNavItem;
  active: boolean;
  Icon: LucideIcon;
}) {
  const content = (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-ink text-white"
          : "text-gray-600 hover:bg-gray-50 hover:text-ink",
        item.disabled && "pointer-events-none opacity-40",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.disabled && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          em breve
        </span>
      )}
    </div>
  );

  if (item.disabled || !item.href) return content;
  return <Link href={item.href}>{content}</Link>;
}
