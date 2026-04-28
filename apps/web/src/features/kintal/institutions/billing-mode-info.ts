import type { OrgBillingMode } from "./types";

interface ModeMeta {
  label: string;
  description: string;
  /** Se true, recarregar créditos não tem efeito prático (ainda assim é permitido). */
  unlimited: boolean;
  /** Se true, ainda não está implementado no MVP — UI mostra como rascunho. */
  preview: boolean;
}

export const BILLING_MODE_INFO: Record<OrgBillingMode, ModeMeta> = {
  pool: {
    label: "Pool de créditos",
    description:
      "Pré-pago. Todos os professores consomem do mesmo saldo da instituição.",
    unlimited: false,
    preview: false,
  },
  unlimited: {
    label: "Cortesia (ilimitado)",
    description:
      "Acesso completo sem checagem de saldo. Consumo continua no ledger pra auditoria.",
    unlimited: true,
    preview: false,
  },
  per_teacher: {
    label: "Por professor",
    description: "Cada member recebe um limite mensal pelo plano da instituição.",
    unlimited: false,
    preview: true,
  },
  pay_per_use: {
    label: "Pós-pago",
    description: "Consumo livre, fatura periódica via Stripe.",
    unlimited: false,
    preview: true,
  },
};

export function billingModeLabel(mode: OrgBillingMode | null): string {
  if (!mode) return "—";
  return BILLING_MODE_INFO[mode].label;
}
