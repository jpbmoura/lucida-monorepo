"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { notifyBalanceChanged } from "./balance-widget";

/**
 * Mostra quando o user volta do checkout Stripe com ?checkout=success.
 * Dispara o refetch do saldo porque os créditos do plano acabaram de ser
 * creditados via webhook — a UI precisa refletir isso rapidinho.
 */
export function CheckoutSuccessBanner() {
  useEffect(() => {
    notifyBalanceChanged();
  }, []);

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      <div>
        <div className="font-medium">Pagamento confirmado!</div>
        <div className="mt-0.5 text-[13px] text-emerald-700">
          Seus créditos já foram depositados. Pode voltar a usar a Lulu à vontade.
        </div>
      </div>
    </div>
  );
}
