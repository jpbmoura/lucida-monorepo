"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MethodBadge } from "../components/method-badge";
import type {
  DocsNavEvent,
  DocsNavGroup,
  DocsNavItem,
  DocsNavLeaf,
  DocsNavSection,
} from "./nav-sections";

interface DocsSidebarNavProps {
  sections: DocsNavSection[];
}

export function DocsSidebarNav({ sections }: DocsSidebarNavProps) {
  return (
    <nav className="flex flex-col gap-7">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2.5">
          <div className="px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
            {section.label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item, idx) => (
              <li key={itemKey(item, idx)}>
                {item.kind === "leaf" && <LeafLink item={item} />}
                {item.kind === "group" && <GroupItem group={item} />}
                {item.kind === "event" && <EventLink item={item} />}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function itemKey(item: DocsNavItem, idx: number): string {
  if (item.kind === "leaf" || item.kind === "event") return item.href;
  return `${item.basePath}-${idx}`;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/docs") return pathname === "/docs";
  return pathname === href || pathname.startsWith(href + "/");
}

function LeafLink({ item }: { item: DocsNavLeaf }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-md border-l-2 px-3 py-1.5 text-[13px] transition-colors",
        active
          ? "border-analytics-primary bg-analytics-primary/8 font-medium text-analytics-primary"
          : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}

function EventLink({ item }: { item: DocsNavEvent }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-md border-l-2 px-3 py-1.5 text-[12.5px] transition-colors",
        active
          ? "border-analytics-primary bg-analytics-primary/8 font-medium text-analytics-primary"
          : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-ink",
      )}
    >
      <code className="font-mono text-[12px]">{item.event}</code>
    </Link>
  );
}

function GroupItem({ group }: { group: DocsNavGroup }) {
  const pathname = usePathname();
  // Abre por padrão quando a rota atual está dentro do grupo (basePath
  // bate ou algum filho leaf bate). Mantém estado local pra o user
  // poder fechar manualmente depois.
  const insideGroup = pathname.startsWith(group.basePath);
  const [open, setOpen] = useState(insideGroup);

  // Reabre se o user navegar pra dentro do grupo via outro lugar.
  useEffect(() => {
    if (insideGroup) setOpen(true);
  }, [insideGroup]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors",
          insideGroup
            ? "font-medium text-ink"
            : "text-gray-600 hover:bg-gray-50 hover:text-ink",
        )}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul className="mt-1 flex flex-col gap-px pl-3">
          {group.items.map((child) => {
            const active = isActive(pathname, child.href);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md border-l-2 px-3 py-1.5 text-[12.5px] transition-colors",
                    active
                      ? "border-analytics-primary bg-analytics-primary/8 font-medium text-analytics-primary"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-ink",
                  )}
                >
                  {child.kind === "route" && (
                    <MethodBadge
                      method={child.method}
                      variant={active ? "solid" : "soft"}
                      size="xs"
                      className="shrink-0"
                    />
                  )}
                  {child.kind === "event" ? (
                    <code className="font-mono text-[12px]">{child.event}</code>
                  ) : (
                    <span className="truncate">{child.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
