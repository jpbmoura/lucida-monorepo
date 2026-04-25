"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CurrentSubscriptionDTO } from "../data";
import { PLANS, formatBRL } from "../plans";

/**
 * Card à direita do hero do saldo — dois estados:
 * - Sem assinatura: CTA "Ver planos" (vai pro /precos).
 * - Com assinatura: mostra plano + data de renovação + botão "Gerenciar"
 *   que abre o Customer Portal do Stripe.
 */
export function PlanCard({
  subscription,
}: {
  subscription: CurrentSubscriptionDTO | null;
}) {
  if (!subscription) {
    return <NoPlanCard />;
  }
  return <CurrentPlanCard subscription={subscription} />;
}

function NoPlanCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="inline-flex items-center gap-2 self-start rounded-pill bg-brand-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-brand-primary">
        <Sparkles className="size-3" />
        Sem assinatura ativa
      </div>
      <h3 className="text-lg font-medium tracking-tight text-ink">
        Desbloqueie uso contínuo
      </h3>
      <p className="text-sm leading-relaxed text-gray-500">
        Você está usando os créditos de boas-vindas. Assinando, seu saldo
        renova todo ciclo e você ganha suporte prioritário.
      </p>
      <ul className="flex flex-col gap-1.5 text-[13px] text-gray-600">
        <Bullet>A partir de R$ 49,90/mês</Bullet>
        <Bullet>Alunos, provas e correções ilimitadas</Bullet>
        <Bullet>Sem fidelidade — cancela a qualquer momento</Bullet>
      </ul>
      <Button asChild variant="primary" size="md">
        <Link href="/precos">Ver planos</Link>
      </Button>
    </div>
  );
}

function CurrentPlanCard({
  subscription,
}: {
  subscription: CurrentSubscriptionDTO;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = PLANS[subscription.planId];

  async function openPortal() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/v1/billing/subscription/portal", {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Não foi possível abrir o portal.");
      }
      const { data } = (await res.json()) as { data: { url: string } };
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            Plano atual
          </div>
          <h3 className="mt-1 text-xl font-medium tracking-tight text-ink">
            {subscription.planName}
          </h3>
          <div className="mt-0.5 text-sm text-gray-500">
            {formatBRL(plan.priceCents)}/
            {plan.period === "monthly" ? "mês" : "ano"}
          </div>
        </div>
        <StatusBadge
          status={subscription.status}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
        />
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-[12px] text-gray-600">
        {subscription.cancelAtPeriodEnd ? (
          <>
            Cancelamento agendado — acesso ativo até{" "}
            <span className="font-medium text-ink">
              {periodEnd.toLocaleDateString("pt-BR")}
            </span>
            .
          </>
        ) : (
          <>
            Próxima renovação em{" "}
            <span className="font-medium text-ink">
              {periodEnd.toLocaleDateString("pt-BR")}
            </span>
            .
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={openPortal}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Settings className="size-4" />
          )}
          Gerenciar
        </Button>
        <Button asChild variant="ghost" size="md" className="flex-1">
          <Link href="/precos">
            <ExternalLink className="size-3.5" />
            Ver planos
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

function StatusBadge({
  status,
  cancelAtPeriodEnd,
}: {
  status: CurrentSubscriptionDTO["status"];
  cancelAtPeriodEnd: boolean;
}) {
  if (cancelAtPeriodEnd) {
    return <Pill tone="amber">Cancelando</Pill>;
  }
  if (status === "active") return <Pill tone="emerald">Ativa</Pill>;
  if (status === "past_due") return <Pill tone="red">Pagamento pendente</Pill>;
  if (status === "paused") return <Pill tone="amber">Pausada</Pill>;
  return <Pill tone="gray">Cancelada</Pill>;
}

function Pill({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "red" | "gray";
  children: React.ReactNode;
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-100 text-gray-600",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
        styles,
      )}
    >
      {children}
    </span>
  );
}
