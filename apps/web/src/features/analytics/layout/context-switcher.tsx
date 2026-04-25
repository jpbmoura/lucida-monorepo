"use client";

import Link from "next/link";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextSwitcherProps {
  /** "analytics" quando mostrado no topbar /analytics; "app" no topbar /app. */
  current: "analytics" | "app";
}

/**
 * Segmented control que permite alternar entre visão institucional
 * (/analytics) e visão pessoal (/app). Se o user não tiver acesso a um dos
 * contextos, o middleware redireciona ele de volta com o sign-in — por isso
 * o controle é sempre exibido; a validação real acontece no roteamento.
 */
export function ContextSwitcher({ current }: ContextSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Alternar entre instituição e minha conta"
      className="flex items-center gap-1 rounded-pill border border-gray-200 bg-gray-50 p-1"
    >
      <SwitcherLink
        href="/analytics"
        active={current === "analytics"}
        icon={<Building2 className="size-3.5" />}
        label="Instituição"
      />
      <SwitcherLink
        href="/app"
        active={current === "app"}
        icon={<User className="size-3.5" />}
        label="Minha conta"
      />
    </div>
  );
}

function SwitcherLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-white text-ink shadow-soft"
          : "text-gray-500 hover:text-ink",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
