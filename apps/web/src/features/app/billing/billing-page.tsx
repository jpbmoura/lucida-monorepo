import {
  Coins,
  Gift,
  Package,
  Repeat,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatTimeUntil } from "@/lib/relative-time";
import type { InstitutionalBillingContext, OrgBillingMode } from "@/lib/active-organization";
import type {
  BalanceDTO,
  CreditSource,
  CurrentSubscriptionDTO,
  InvoiceListItemDTO,
  LedgerItemDTO,
  LedgerReason,
} from "./data";
import { PlanCard } from "./components/plan-card";
import { CheckoutSuccessBanner } from "./components/checkout-success-banner";
import { TopupsSection } from "./components/topups-section";
import { InvoicesSection } from "./components/invoices-section";
import { InstitutionalBillingBanner } from "./components/institutional-billing-banner";

interface BillingPageProps {
  balance: BalanceDTO;
  ledger: LedgerItemDTO[];
  subscription: CurrentSubscriptionDTO | null;
  invoices: InvoiceListItemDTO[];
  checkoutSuccess: boolean;
  /**
   * Contexto de cobrança institucional. `null` = professor avulso, mostra
   * UI normal (saldo, plano, topups, faturas). Quando preenchido, troca a
   * UI por uma versão institucional — banner contextual + ledger pra
   * auditoria.
   */
  institutionalContext: InstitutionalBillingContext | null;
  /** Necessário pro banner escolher ícone e tom — só preenchido junto
   *  com `institutionalContext`. */
  billingMode: OrgBillingMode | null;
}

export function BillingPage({
  balance,
  ledger,
  subscription,
  invoices,
  checkoutSuccess,
  institutionalContext,
  billingMode,
}: BillingPageProps) {
  const showInstitutional =
    institutionalContext !== null &&
    institutionalContext.hidePersonalWallet &&
    billingMode !== null;

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Créditos e plano
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {showInstitutional ? (
            <>
              Cobertura{" "}
              <span className="font-serif font-normal italic text-brand-primary">
                institucional
              </span>
            </>
          ) : (
            <>
              Saldo e{" "}
              <span className="font-serif font-normal italic text-brand-primary">
                assinatura
              </span>
            </>
          )}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          {showInstitutional
            ? "Sua instituição cobre os créditos que você consome. Abaixo, o histórico das suas ações pra auditoria."
            : "Você paga pelo que a IA faz por você. Cada ação consome créditos proporcionais ao material e à complexidade."}
        </p>
      </header>

      {checkoutSuccess && !showInstitutional && <CheckoutSuccessBanner />}

      {showInstitutional ? (
        <InstitutionalBillingBanner
          context={institutionalContext}
          mode={billingMode}
        />
      ) : (
        <>
          <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
            <BalanceHero total={balance.total} breakdown={balance.breakdown} />
            <PlanCard subscription={subscription} />
          </section>

          <TopupsSection />

          <InvoicesSection items={invoices} />
        </>
      )}

      <section className="mb-4">
        <header className="mb-5 flex flex-col gap-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            Histórico
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-ink">
            {showInstitutional ? "Suas ações" : "Últimas transações"}
          </h2>
          <p className="text-sm text-gray-500">
            {showInstitutional
              ? "Cada linha é uma ação sua descontada da cobertura institucional — imutável e auditável."
              : "Cada linha é uma entrada no seu ledger — imutável e auditável."}
          </p>
        </header>
        <LedgerTable items={ledger} />
      </section>
    </div>
  );
}

function BalanceHero({
  total,
  breakdown,
}: {
  total: number;
  breakdown: BalanceDTO["breakdown"];
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-white shadow-soft">
      <div className="p-8">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
          <Coins className="size-3.5" />
          Saldo total
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-5xl font-medium tabular-nums tracking-tighter">
            {total.toLocaleString("pt-BR")}
          </span>
          <span className="text-lg text-white/50">créditos</span>
        </div>
        <p className="mt-3 max-w-md text-[13px] text-white/60">
          Uma prova de 10 questões consome em média ~700 créditos. Regerar
          uma questão custa ~70. Quanto maior e mais complexo o material,
          mais créditos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px bg-white/5 md:grid-cols-2">
        {breakdown.length === 0 ? (
          <div className="bg-ink px-6 py-4 text-xs text-white/40">
            Nenhuma carteira ativa.
          </div>
        ) : (
          breakdown.map((b) => (
            <div key={b.source} className="bg-ink px-6 py-4">
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <SourceBadge source={b.source} />
                {sourceLabel(b.source)}
              </div>
              <div className="mt-1 text-xl font-medium tabular-nums">
                {b.balance.toLocaleString("pt-BR")}
              </div>
              {b.expiresAt && (
                <div className="mt-0.5 text-[11px] text-white/40">
                  Expira {formatTimeUntil(b.expiresAt)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LedgerTable({ items }: { items: LedgerItemDTO[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-500">
        Nenhuma transação ainda.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
            <th className="px-5 py-2.5">Motivo</th>
            <th className="hidden px-5 py-2.5 md:table-cell">Origem</th>
            <th className="px-5 py-2.5 text-right">Créditos</th>
            <th className="px-5 py-2.5 text-right">Quando</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              className={cn(
                "transition-colors hover:bg-gray-50",
                i < items.length - 1 && "border-b border-gray-100",
              )}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-md",
                      item.type === "credit"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-50 text-gray-500",
                    )}
                  >
                    {item.type === "credit" ? (
                      <ArrowDownLeft className="size-3.5" />
                    ) : (
                      <ArrowUpRight className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">
                      {reasonLabel(item.reason)}
                    </div>
                    {item.relatedAction && (
                      <div className="mt-0.5 truncate text-[11px] text-gray-500">
                        {actionLabel(item.relatedAction)}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="hidden px-5 py-3 md:table-cell">
                <SourceBadge source={item.walletSource as CreditSource} inline />
              </td>
              <td className="px-5 py-3 text-right">
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    item.type === "credit" ? "text-emerald-700" : "text-ink",
                  )}
                >
                  {item.type === "credit" ? "+" : "−"}
                  {item.amount.toLocaleString("pt-BR")}
                </span>
              </td>
              <td className="px-5 py-3 text-right text-xs text-gray-500">
                {formatRelativeTime(item.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceBadge({
  source,
  inline,
}: {
  source: CreditSource;
  inline?: boolean;
}) {
  const Icon =
    source === "subscription"
      ? Repeat
      : source === "topup"
        ? Package
        : source === "welcome"
          ? Gift
          : Sparkles;
  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
        <Icon className="size-3" />
        {sourceLabel(source)}
      </span>
    );
  }
  return <Icon className="size-3.5" />;
}

function sourceLabel(source: CreditSource): string {
  switch (source) {
    case "subscription":
      return "Assinatura";
    case "topup":
      return "Pacote avulso";
    case "welcome":
      return "Boas-vindas";
    case "promo":
      return "Promocional";
  }
}

function reasonLabel(reason: LedgerReason): string {
  switch (reason) {
    case "welcome_bonus":
      return "Bônus de boas-vindas";
    case "subscription_renewal":
      return "Renovação de assinatura";
    case "topup_purchase":
      return "Compra de créditos";
    case "promo_grant":
      return "Crédito promocional";
    case "ai_consumption":
      return "Uso de IA";
    case "expiration":
      return "Expiração";
    case "refund":
      return "Reembolso";
    case "adjustment":
      return "Ajuste manual";
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "generate_exam":
      return "Geração de prova";
    case "regenerate_question":
      return "Regeneração de questão";
    default:
      return action;
  }
}
