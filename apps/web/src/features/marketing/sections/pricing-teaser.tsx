import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { cn } from "@/lib/utils";
import { PLANS, formatBRL } from "@/features/app/billing/plans";

interface TeaserPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
  external?: boolean;
}

const PLAN_CARDS: TeaserPlan[] = [
  {
    name: "Básico",
    price: formatBRL(PLANS.basic_monthly.priceCents),
    period: "/mês",
    description: "Para começar e organizar suas avaliações.",
    features: [
      `${PLANS.basic_monthly.creditsPerCycle.toLocaleString("pt-BR")} créditos por mês`,
      "Alunos e provas ilimitados",
      "Correção automática ilimitada",
    ],
    cta: "Começar agora",
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: formatBRL(PLANS.pro_monthly.priceCents),
    period: "/mês",
    description: "O preferido pelos professores com várias turmas.",
    features: [
      `${PLANS.pro_monthly.creditsPerCycle.toLocaleString("pt-BR")} créditos por mês`,
      "Alunos e provas ilimitados",
      "Correção automática ilimitada",
      "Suporte prioritário",
    ],
    highlight: true,
    cta: "Assinar Pro",
    href: "/precos",
  },
  {
    name: "Instituição",
    price: "Sob medida",
    period: "",
    description:
      "Escolas e redes com gestão centralizada e saldo compartilhado.",
    features: [
      "Pool de créditos institucional",
      "Análises consolidadas",
      "Onboarding dedicado",
    ],
    cta: "Falar com a gente",
    href: "/contact/institutions",
  },
];

export function PricingTeaserSection() {
  return (
    <section id="pricing-teaser" className="relative py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Preços simples,{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              sem fidelidade
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Alunos, provas e correções ilimitados. Você paga apenas pelos
            créditos que a IA consome.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {PLAN_CARDS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Tem plano anual com{" "}
          <span className="font-medium text-ink">20% de desconto</span> —{" "}
          <Link
            href="/precos"
            className="font-medium text-brand-primary underline underline-offset-4 hover:text-brand-dark-01"
          >
            ver detalhes
          </Link>
          .
        </div>
      </Container>
    </section>
  );
}

function PlanCard({ plan }: { plan: TeaserPlan }) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-6 rounded-2xl border p-7 transition-all",
        plan.highlight
          ? "border-transparent bg-ink text-white shadow-pop"
          : "border-gray-100 bg-white hover:border-gray-200",
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-brand-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          <Sparkles className="size-3" />
          Mais popular
        </span>
      )}

      <div className="flex flex-col gap-1">
        <h3
          className={cn(
            "text-sm font-medium uppercase tracking-[0.08em]",
            plan.highlight ? "text-white/60" : "text-gray-500",
          )}
        >
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-4xl font-medium tracking-tighter",
              plan.highlight ? "text-white" : "text-ink",
            )}
          >
            {plan.price}
          </span>
          {plan.period && (
            <span
              className={cn(
                "text-sm",
                plan.highlight ? "text-white/50" : "text-gray-400",
              )}
            >
              {plan.period}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-sm",
            plan.highlight ? "text-white/70" : "text-gray-500",
          )}
        >
          {plan.description}
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex items-center gap-2.5 text-sm",
              plan.highlight ? "text-white/90" : "text-gray-700",
            )}
          >
            <Check
              className={cn(
                "size-4 shrink-0",
                plan.highlight ? "text-brand-light" : "text-brand-primary",
              )}
              strokeWidth={2.5}
            />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={plan.highlight ? "accent" : "outline"}
        size="md"
        className="mt-auto"
      >
        <Link href={plan.href}>
          {plan.cta}
          <ArrowRight />
        </Link>
      </Button>
    </article>
  );
}
