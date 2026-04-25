import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DocsSidebarNav } from "./sidebar-nav";
import { DOCS_NAV_SECTIONS } from "./nav-sections";

export function DocsSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-65 shrink-0 flex-col border-r border-gray-100 bg-white lg:flex">
      <div className="flex items-center border-b border-gray-100 px-6 py-5">
        <Link
          href="/docs"
          aria-label="Documentação Lucida"
          className="flex items-center gap-2"
        >
          <Logo variant="analytics" priority className="h-6" />
          <span className="rounded-md bg-analytics-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-analytics-primary">
            docs
          </span>
        </Link>
      </div>

      <div className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
        <DocsSidebarNav sections={DOCS_NAV_SECTIONS} />
      </div>

      <div className="border-t border-gray-100 p-4">
        <Link
          href="/analytics/desenvolvedores"
          className="inline-flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-gray-50"
        >
          Dashboard do dev
          <ArrowUpRight className="size-3.5 text-gray-400" />
        </Link>
      </div>
    </aside>
  );
}
