"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLANS,
  formatBRL,
  monthlyEquivalent,
  type PlanPeriod,
  type PlanDefinition,
} from "@/features/app/billing/plans";
import type { PlanId } from "@/features/app/billing/data";

export function PricingPage() {
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tiers: PlanDefinition[] =
    period === "monthly"
      ? [PLANS.basic_monthly, PLANS.pro_monthly]
      : [PLANS.basic_yearly, PLANS.pro_yearly];

  async function startCheckout(planId: PlanId) {
    setError(null);
    setLoadingPlan(planId);
    try {
      const res = await fetch("/v1/billing/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (res.status === 401) {
        // Sem sessão — redireciona pro sign-in com retorno pra cá.
        window.location.href = `/sign-in?next=${encodeURIComponent(
          `/precos?plan=${planId}`,
        )}`;
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ?? "Não foi possível iniciar o checkout.",
        );
      }
      const { data } = (await res.json()) as { data: { url: string } };
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setLoadingPlan(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 md:px-10 md:py-24">
      <header className="mb-12 flex flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Planos e preços
        </div>
        <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
          Planos simples. Uso{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            ilimitado
          </span>
          .
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-gray-500">
          Alunos, provas e correções ilimitados em todos os planos. Você paga
          apenas pelos créditos que a IA da Lulu consome.
        </p>

        <div
          role="tablist"
          aria-label="Período"
          className="mt-8 inline-flex rounded-pill bg-gray-100 p-1"
        >
          <PeriodButton
            active={period === "monthly"}
            onClick={() => setPeriod("monthly")}
          >
            Mensal
          </PeriodButton>
          <PeriodButton
            active={period === "yearly"}
            onClick={() => setPeriod("yearly")}
          >
            Anual
            <span className="ml-1.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
              -20%
            </span>
          </PeriodButton>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mx-auto mb-6 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
        {tiers.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            period={period}
            loading={loadingPlan === plan.id}
            disabled={loadingPlan !== null && loadingPlan !== plan.id}
            onSelect={() => startCheckout(plan.id)}
          />
        ))}
      </div>

      <InstitutionalCTA />

      <FAQ />
    </section>
  );
}

function PeriodButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-pill px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white text-ink shadow-soft"
          : "text-gray-500 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PlanCard({
  plan,
  period,
  loading,
  disabled,
  onSelect,
}: {
  plan: PlanDefinition;
  period: PlanPeriod;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isPro = plan.tier === "pro";
  return (
    <article
      className={cn(
        "relative flex flex-col gap-6 rounded-3xl border p-8 transition-shadow",
        isPro
          ? "border-ink bg-ink text-white shadow-pop"
          : "border-gray-100 bg-white shadow-soft",
      )}
    >
      {isPro && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-brand-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          <Sparkles className="size-3" />
          Mais popular
        </span>
      )}

      <header>
        <h2
          className={cn(
            "text-2xl font-medium tracking-tight",
            isPro ? "text-white" : "text-ink",
          )}
        >
          {plan.name}
        </h2>
        <p
          className={cn(
            "mt-1 text-[13px]",
            isPro ? "text-white/60" : "text-gray-500",
          )}
        >
          {plan.creditsPerCycle.toLocaleString("pt-BR")} créditos{" "}
          {period === "monthly" ? "por mês" : "por ano"}
        </p>
      </header>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-5xl font-medium tabular-nums tracking-tighter",
              isPro ? "text-white" : "text-ink",
            )}
          >
            {formatBRL(plan.priceCents)}
          </span>
          <span className={cn("text-sm", isPro ? "text-white/50" : "text-gray-400")}>
            /{period === "monthly" ? "mês" : "ano"}
          </span>
        </div>
        {period === "yearly" && (
          <div
            className={cn(
              "mt-1 text-[12px]",
              isPro ? "text-white/60" : "text-gray-500",
            )}
          >
            equivalente a {monthlyEquivalent(plan)}/mês
          </div>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {plan.marketingHighlights.map((h, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2.5 text-[14px]",
              isPro ? "text-white/85" : "text-gray-700",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                isPro
                  ? "bg-white/10 text-brand-primary"
                  : "bg-brand-primary/10 text-brand-primary",
              )}
            >
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            {h}
          </li>
        ))}
      </ul>

      <Button
        variant={isPro ? "primary" : "outline"}
        size="lg"
        onClick={onSelect}
        disabled={disabled || loading}
        className={cn(!isPro && "border-ink text-ink hover:bg-gray-50")}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Abrindo checkout...
          </>
        ) : (
          <>
            Assinar {plan.name}
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </article>
  );
}

function InstitutionalCTA() {
  return (
    <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-8 py-8 text-center">
      <h3 className="text-lg font-medium text-ink">Plano Institucional</h3>
      <p className="max-w-xl text-sm text-gray-500">
        Para escolas e redes com múltiplos professores, créditos compartilhados
        ou individuais, gestão centralizada e SLA.
      </p>
      <Link
        href="mailto:contato@lucidaexam.com?subject=Plano%20Institucional"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary transition-colors hover:text-brand-dark-01"
      >
        Falar com vendas
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function FAQ() {
  const items = [
    {
      q: "O que é um crédito?",
      a: "Unidade de uso das ferramentas de IA. Cada ação consome créditos proporcionais ao tamanho do material e à complexidade. 1 crédito = 100 tokens processados.",
    },
    {
      q: "Quantas provas faço com 5.000 créditos?",
      a: "Em média ~200 provas de 10 questões. Varia conforme o tamanho do material enviado.",
    },
    {
      q: "Créditos acumulam entre meses?",
      a: "No plano mensal, não — renovam a cada ciclo. No plano anual você recebe os créditos na ativação e eles valem por 12 meses.",
    },
    {
      q: "E se acabarem no meio do mês?",
      a: "Em breve você poderá comprar pacotes avulsos de créditos. Por enquanto, dá pra dar upgrade de plano a qualquer momento.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. O cancelamento é imediato via Stripe e o acesso continua até o fim do ciclo já pago.",
    },
  ];
  return (
    <div className="mx-auto mt-20 max-w-2xl">
      <h2 className="mb-8 text-center text-2xl font-medium tracking-tight text-ink">
        Perguntas frequentes
      </h2>
      <dl className="flex flex-col gap-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5"
          >
            <dt className="text-sm font-medium text-ink">{item.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
