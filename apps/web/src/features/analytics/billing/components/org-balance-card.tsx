import { Coins, TrendingDown } from "lucide-react";
import type { OrgBillingDTO } from "../data";

interface OrgBalanceCardProps {
  billing: OrgBillingDTO;
}

/**
 * Card com o saldo institucional. MVP foca no modo pool (pré-pago com
 * balance claro). `per_teacher` cai aqui também e mostra "—" com hint —
 * quando virar viável, a lógica se refina. `pay_per_use` (futuro) usa
 * uma versão diferente do card mostrando "uso no período".
 */
export function OrgBalanceCard({ billing }: OrgBalanceCardProps) {
  const { billingMode } = billing.settings;
  const { total, wallets } = billing.balance;

  if (billingMode === "pay_per_use") {
    return <PayPerUsePlaceholder />;
  }

  if (billingMode === "per_teacher") {
    return <PerTeacherPlaceholder />;
  }

  // Modo pool (default).
  const firstExpiry = wallets
    .map((w) => w.expiresAt)
    .filter((d): d is string => d !== null)
    .sort()[0];

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <Coins className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Saldo da instituição
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-medium tabular-nums tracking-tighter text-ink">
              {total.toLocaleString("pt-BR")}
            </span>
            <span className="text-sm text-gray-500">créditos</span>
          </div>
          {firstExpiry && (
            <div className="text-[11px] text-gray-500">
              Expira em {formatDate(firstExpiry)}
            </div>
          )}
          {total === 0 && (
            <div className="text-[11px] text-amber-700">
              Sem saldo — os professores da instituição não conseguem gerar
              provas até recarregar.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-1 md:items-end">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
          Modo
        </div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          Ilimitado (pré-pago)
        </div>
      </div>
    </section>
  );
}

function PayPerUsePlaceholder() {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-dashed border-analytics-primary/30 bg-analytics-primary/5 p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-analytics-primary">
        <TrendingDown className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-analytics-primary">
          Pagar pelo uso · em breve
        </div>
        <div className="text-sm text-gray-600">
          Vai consolidar o consumo da instituição em uma fatura periódica.
        </div>
      </div>
    </section>
  );
}

function PerTeacherPlaceholder() {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-dashed border-analytics-primary/30 bg-analytics-primary/5 p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-analytics-primary">
        <Coins className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-analytics-primary">
          Por professor · em breve
        </div>
        <div className="text-sm text-gray-600">
          Cada docente recebe um limite mensal definido pelo plano da instituição.
        </div>
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
