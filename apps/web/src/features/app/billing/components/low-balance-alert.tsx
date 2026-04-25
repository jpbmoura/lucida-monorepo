"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "../plans";
import type { BalanceDTO, CurrentSubscriptionDTO } from "../data";

const DISMISS_STORAGE_KEY = "lucida:low-balance-dismissed-at";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

interface Severity {
  tone: "amber" | "red";
  title: string;
  message: string;
  cta: string;
  ctaHref: string;
}

/**
 * Banner persistente no topo do AppLayout quando o saldo está baixo.
 * Dismissível por 24h via localStorage.
 *
 * Regras:
 * - COM assinatura: alerta quando o saldo consumido do ciclo passa de 80%.
 *   Vermelho quando passa de 95% (acabou ou quase).
 * - SEM assinatura: alerta quando saldo total < 50. Vermelho quando < 10.
 *
 * Calculado client-side — sem chamada adicional ao backend.
 */
export function LowBalanceAlert({
  balance,
  subscription,
}: {
  balance: BalanceDTO;
  subscription: CurrentSubscriptionDTO | null;
}) {
  const [dismissed, setDismissed] = useState(true); // default dismissed até checkar storage

  useEffect(() => {
    const at = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (at && Date.now() - Number(at) < DISMISS_DURATION_MS) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  }

  const severity = computeSeverity(balance, subscription);
  if (!severity || dismissed) return null;

  const toneClasses =
    severity.tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const iconClass =
    severity.tone === "red" ? "text-red-600" : "text-amber-600";

  return (
    <div
      role="alert"
      className={cn(
        "border-b px-5 py-2.5 text-sm md:px-10",
        toneClasses,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertCircle className={cn("size-4 shrink-0", iconClass)} />
        <div className="min-w-0 flex-1">
          <span className="font-medium">{severity.title}</span>
          <span className="ml-1.5 text-[13px] opacity-80">
            {severity.message}
          </span>
        </div>
        <Link
          href={severity.ctaHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/70 px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
        >
          {severity.cta}
          <ArrowRight className="size-3" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar aviso"
          className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function computeSeverity(
  balance: BalanceDTO,
  subscription: CurrentSubscriptionDTO | null,
): Severity | null {
  if (subscription) {
    const plan = PLANS[subscription.planId];
    const cycleAllocation = plan.creditsPerCycle;
    // Saldo da carteira da assinatura especificamente (ignora topup/welcome).
    const subBalance =
      balance.breakdown.find((b) => b.source === "subscription")?.balance ?? 0;
    const consumed = cycleAllocation - subBalance;
    const percentUsed = cycleAllocation > 0 ? consumed / cycleAllocation : 0;

    if (percentUsed >= 0.95) {
      return {
        tone: "red",
        title: "Créditos do plano quase zerados",
        message: "Compre um pacote avulso pra não interromper o uso da Lulu.",
        cta: "Comprar créditos",
        ctaHref: "/app/billing",
      };
    }
    if (percentUsed >= 0.8) {
      return {
        tone: "amber",
        title: "Você já consumiu 80% do plano neste ciclo",
        message:
          "Considere subir de plano ou reforçar com um pacote avulso.",
        cta: "Ver opções",
        ctaHref: "/app/billing",
      };
    }
    return null;
  }

  if (balance.total < 10) {
    return {
      tone: "red",
      title: "Seus créditos de boas-vindas acabaram",
      message: "Assine um plano pra continuar usando a IA da Lulu.",
      cta: "Ver planos",
      ctaHref: "/precos",
    };
  }
  if (balance.total < 50) {
    return {
      tone: "amber",
      title: "Saldo baixo",
      message: `Restam ${balance.total} créditos — considere assinar um plano.`,
      cta: "Ver planos",
      ctaHref: "/precos",
    };
  }
  return null;
}
