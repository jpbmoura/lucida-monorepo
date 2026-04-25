"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";

const DISMISS_KEY = "lucida:upgrade-card-dismissed";

/**
 * Card promocional no rodapé do sidebar.
 * - Não renderiza pra quem já tem assinatura ativa.
 * - Dismissível pela sessão atual (sessionStorage — zera ao fechar o browser).
 */
export function SidebarUpgradeCard({
  hasActiveSubscription,
}: {
  hasActiveSubscription: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (hasActiveSubscription) return;
    const flag = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(flag === "1");
  }, [hasActiveSubscription]);

  if (hasActiveSubscription || dismissed) {
    return null;
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <div className="relative overflow-hidden rounded-xl bg-brand-super-dark p-5 text-brand-off-white">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="absolute right-2 top-2 grid size-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>

        <div className="mb-1 flex items-center gap-2 text-sm font-medium">
          <Zap className="size-3.5" strokeWidth={2.5} />
          Plano Pro
        </div>
        <p className="mb-4 text-xs leading-snug text-white/70">
          Provas ilimitadas, correção com IA e análises avançadas.
        </p>
        <Link
          href="/precos"
          className="block w-full rounded-sm bg-brand-primary px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-brand-dark-01"
        >
          Fazer upgrade
        </Link>
      </div>
    </div>
  );
}
