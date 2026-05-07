import { Building2, Infinity as InfinityIcon } from "lucide-react";
import type { InstitutionalBillingContext } from "@/lib/active-organization";

interface Props {
  context: InstitutionalBillingContext;
  /** Modo institucional ativo — define ícone e tom. */
  mode: "unlimited" | "pool" | "pay_per_use" | "per_teacher";
}

/**
 * Banner que substitui as seções de wallet pessoal na página /app/billing
 * quando o professor é member de uma instituição que cobre os créditos.
 * Mensagem específica por modo vem de `getInstitutionalBillingContext`.
 */
export function InstitutionalBillingBanner({ context, mode }: Props) {
  const Icon = mode === "unlimited" ? InfinityIcon : Building2;
  return (
    <section className="mb-10 overflow-hidden rounded-2xl bg-ink text-white shadow-soft">
      <div className="flex items-start gap-5 p-8">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-white/90">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
            <span className="pulse-dot" />
            Cobertura institucional
          </div>
          <h2 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">
            {context.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/70">
            {context.description}
          </p>
        </div>
      </div>
    </section>
  );
}
