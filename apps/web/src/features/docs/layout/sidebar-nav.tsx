"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface DocsNavItem {
  label: string;
  href: string;
}

export interface DocsNavSection {
  label: string;
  items: DocsNavItem[];
}

interface DocsSidebarNavProps {
  sections: DocsNavSection[];
}

export function DocsSidebarNav({ sections }: DocsSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <div className="px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
            {section.label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/docs" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      // Barra lateral roxa à esquerda (via border) quando ativo —
                      // padrão de docs modernas (Vercel, Linear). Inactive mantém
                      // border transparent pra o texto não pular horizontalmente
                      // entre estados.
                      "flex items-center rounded-md border-l-2 px-3 py-1.5 text-[13px] transition-colors",
                      isActive
                        ? "border-analytics-primary bg-analytics-primary/8 font-medium text-analytics-primary"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
