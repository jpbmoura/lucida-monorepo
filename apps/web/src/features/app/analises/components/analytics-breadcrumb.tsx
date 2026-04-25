import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbNode {
  label: string;
  href?: string;
}

export function AnalyticsBreadcrumb({ nodes }: { nodes: BreadcrumbNode[] }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {node.href && !isLast ? (
              <Link
                href={node.href}
                className="truncate transition-colors hover:text-ink"
              >
                {node.label}
              </Link>
            ) : (
              <span className="truncate text-ink">{node.label}</span>
            )}
            {!isLast && <ChevronRight className="size-3.5 text-gray-300" />}
          </span>
        );
      })}
    </nav>
  );
}
