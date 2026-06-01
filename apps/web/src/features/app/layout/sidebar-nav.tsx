"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  Presentation,
  Sparkles,
  Settings,
  HelpCircle,
  ScanLine,
  FolderOpen,
  ClipboardCheck,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewExamSidebarRow } from "./new-exam-sidebar-row";
import { NewLessonPlanSidebarRow } from "./new-lesson-plan-sidebar-row";
import { ScannerSidebarRow } from "./scanner-sidebar-row";

// Icons são resolvidos no client — não dá pra passar componentes React como
// prop atravessando a fronteira server→client (não serializam).
const ICONS = {
  layout: LayoutGrid,
  users: Users,
  file: FileText,
  chart: BarChart3,
  book: BookOpen,
  presentation: Presentation,
  sparkles: Sparkles,
  settings: Settings,
  help: HelpCircle,
  scan: ScanLine,
  folder: FolderOpen,
  "clipboard-check": ClipboardCheck,
  plug: Plug,
} as const;

export type SidebarIcon = keyof typeof ICONS;

/** IDs de ações que disparam comportamentos no client (dialogs, etc). */
export type SidebarAction = "new-exam" | "new-lesson-plan" | "scanner";

export interface SidebarNavItem {
  label: string;
  icon: SidebarIcon;
  /** URL — se presente, item renderiza como Link. */
  href?: string;
  /**
   * Action — se presente, item dispara comportamento client em vez de navegar.
   * Use href OU action, não os dois.
   */
  action?: SidebarAction;
  disabled?: boolean;
  children?: Array<{ label: string; href: string; disabled?: boolean }>;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.href ? matchRoute(pathname, item.href) : false;
        const isSectionActive =
          item.children?.some((c) => matchRoute(pathname, c.href)) ?? false;

        return (
          // label como fallback: itens desabilitados (placeholders "em breve")
          // não têm href nem action, então href/action sozinhos colidiriam.
          <div key={item.href || item.action || item.label}>
            <NavRow item={item} active={isActive} Icon={ICONS[item.icon]} />
            {item.children && (isActive || isSectionActive) && (
              <ul className="ml-[30px] mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
                {item.children.map((child) => {
                  const childActive = matchRoute(pathname, child.href);
                  return (
                    <li key={child.href}>
                      <SubRow child={child} active={childActive} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function matchRoute(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  active,
  Icon,
}: {
  item: SidebarNavItem;
  active: boolean;
  Icon: LucideIcon;
}) {
  // Action items delegam pra componente client próprio que abre o dialog.
  if (item.action === "new-exam") {
    return (
      <NewExamSidebarRow label={item.label} Icon={Icon} disabled={item.disabled} />
    );
  }
  if (item.action === "new-lesson-plan") {
    return (
      <NewLessonPlanSidebarRow
        label={item.label}
        Icon={Icon}
        disabled={item.disabled}
      />
    );
  }
  if (item.action === "scanner") {
    return (
      <ScannerSidebarRow label={item.label} Icon={Icon} disabled={item.disabled} />
    );
  }

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

function SubRow({
  child,
  active,
}: {
  child: { label: string; href: string; disabled?: boolean };
  active: boolean;
}) {
  const content = (
    <div
      className={cn(
        "rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        active ? "bg-gray-50 text-ink" : "text-gray-500 hover:bg-gray-50 hover:text-ink",
        child.disabled && "pointer-events-none opacity-40",
      )}
    >
      {child.label}
    </div>
  );
  if (child.disabled) return content;
  return <Link href={child.href}>{content}</Link>;
}
