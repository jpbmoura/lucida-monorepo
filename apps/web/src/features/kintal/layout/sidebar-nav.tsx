"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Banknote,
  Megaphone,
  Headphones,
  Wrench,
  ShieldCheck,
  Map,
  Users,
  KanbanSquare,
  Bell,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  layout: LayoutGrid,
  money: Banknote,
  commercial: Megaphone,
  support: Headphones,
  ops: Wrench,
  shield: ShieldCheck,
  map: Map,
  users: Users,
  board: KanbanSquare,
  bell: Bell,
  building: Building2,
} as const;

export type KintalSidebarIcon = keyof typeof ICONS;

export interface KintalSidebarNavItem {
  label: string;
  icon: KintalSidebarIcon;
  href?: string;
  disabled?: boolean;
}

interface KintalSidebarNavProps {
  items: KintalSidebarNavItem[];
}

export function KintalSidebarNav({ items }: KintalSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavRow
          key={`${item.href ?? "disabled"}-${item.label}`}
          item={item}
          Icon={ICONS[item.icon]}
          active={item.href ? matchRoute(pathname, item.href) : false}
        />
      ))}
    </nav>
  );
}

function matchRoute(pathname: string, href: string): boolean {
  if (href === "/kintal") return pathname === "/kintal";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  active,
  Icon,
}: {
  item: KintalSidebarNavItem;
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
        <span className="text-[10px] font-normal uppercase tracking-[0.12em] text-gray-400">
          em breve
        </span>
      )}
    </div>
  );

  if (item.disabled || !item.href) return content;
  return <Link href={item.href}>{content}</Link>;
}
