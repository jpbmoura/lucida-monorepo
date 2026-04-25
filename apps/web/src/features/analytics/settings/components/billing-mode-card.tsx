import { Check } from "lucide-react";
import type { OrgBillingMode } from "@/lib/active-organization";

interface BillingModeCardProps {
  current: OrgBillingMode;
}

interface ModeOption {
  id: OrgBillingMode;
  title: string;
  subtitle: string;
  body: string;
  available: boolean;
}

const OPTIONS: ModeOption[] = [
  {
    id: "pool",
    title: "Ilimitado (pré-pago)",
    subtitle: "Os créditos são comprados pela instituição e consumidos por todos.",
    body:
      "Modo mais simples — a instituição recarrega créditos e qualquer docente usa do mesmo pote. A wallet pessoal fica intocada enquanto o professor pertence à instituição.",
    available: true,
  },
  {
    id: "per_teacher",
    title: "Por professor",
    subtitle: "Cada docente recebe um limite mensal definido pelo plano.",
    body:
      "Cada professor tem um limite individual de créditos por mês, alocado pela instituição. Útil pra evitar que um docente consuma todo o saldo.",
    available: false,
  },
  {
    id: "pay_per_use",
    title: "Pagar pelo uso (pós-pago)",
    subtitle: "Sem limite durante o uso, fatura periódica baseada no consumo.",
    body:
      "Os docentes não são bloqueados por saldo. O consumo é acumulado e a instituição recebe uma fatura mensal via Stripe.",
    available: false,
  },
];

/**
 * Seletor de modo de cobrança. MVP: apenas leitura — só "pool" está
 * implementado; mudar requer migração de saldos e fica pra iteração
 * futura. Per_teacher e pay_per_use aparecem como "em breve" pra comunicar
 * a direção.
 */
export function BillingModeCard({ current }: BillingModeCardProps) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          Modo de cobrança
        </h2>
        <p className="text-xs text-gray-500">
          Como os créditos consumidos pelos docentes são contabilizados.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const isActive = opt.id === current;
          return (
            <li
              key={opt.id}
              aria-current={isActive ? "true" : undefined}
              aria-disabled={!opt.available}
              className={
                "flex items-start gap-4 rounded-xl border p-4 transition-colors " +
                (isActive
                  ? "border-analytics-primary bg-analytics-primary/5"
                  : opt.available
                    ? "border-gray-200 bg-white"
                    : "border-dashed border-gray-200 bg-gray-50/40")
              }
            >
              <div
                className={
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border " +
                  (isActive
                    ? "border-analytics-primary bg-analytics-primary text-white"
                    : "border-gray-300 bg-white text-transparent")
                }
              >
                <Check className="size-3" strokeWidth={3} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {opt.title}
                  </span>
                  {!opt.available && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                      em breve
                    </span>
                  )}
                  {isActive && (
                    <span className="rounded-full bg-analytics-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary">
                      Ativo
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-500">{opt.subtitle}</p>
                <p className="text-[12px] leading-relaxed text-gray-600">
                  {opt.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-gray-400">
        Mudar de modo depois de já ter consumo é uma operação manual no
        momento. Fale com o suporte se precisar trocar.
      </p>
    </section>
  );
}
