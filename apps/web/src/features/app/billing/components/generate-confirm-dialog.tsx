"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Coins, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GenerateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Estimativa CLIENT-SIDE — o backend faz o check real com margem de segurança. */
  estimate: number;
  onConfirm: () => void | Promise<void>;
}

/**
 * Mostrado antes de gerar prova (ação de maior custo). Duas variantes:
 *
 *   - Professor avulso: busca saldo pessoal e pré-valida contra a estimativa.
 *   - Professor institucional em pool/pay_per_use: esconde saldo pessoal
 *     (não é fonte do débito), mostra "Pago pela instituição". O check real
 *     continua no backend — aqui é só transparência.
 */
export function GenerateConfirmDialog({
  open,
  onOpenChange,
  estimate,
  onConfirm,
}: GenerateConfirmDialogProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgPays, setOrgPays] = useState(false);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    setLoading(true);
    // Duas chamadas em paralelo. active-organization é barata; alimenta o
    // modo visual. Balance só importa quando o user paga do próprio bolso.
    Promise.all([
      fetch("/v1/billing/balance", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/v1/analytics/active-organization", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([balanceBody, orgBody]) => {
        if (canceled) return;
        setBalance(balanceBody?.data?.total ?? null);
        const mode = orgBody?.data?.billingMode ?? null;
        setOrgPays(mode === "pool" || mode === "pay_per_use");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [open]);

  // Em modo institucional não avaliamos saldo pessoal — ele está congelado
  // e não vai ser usado. O check real acontece no backend.
  const insufficient = !orgPays && balance !== null && balance < estimate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar geração</DialogTitle>
          <DialogDescription>
            Estimativa antes de chamar a IA. O débito final usa os tokens de
            fato consumidos — pode variar um pouco.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 px-5 py-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Custo estimado
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-medium tabular-nums text-ink">
                ~{estimate}
              </span>
              <span className="text-xs text-gray-500">créditos</span>
            </div>
          </div>
          {orgPays ? (
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                Cobrança
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5 text-ink">
                <Building2 className="size-3.5 text-gray-500" />
                <span className="text-sm font-medium">Pago pela instituição</span>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                Saldo atual
              </div>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <Coins className="size-3.5 text-gray-400" />
                <span className="text-2xl font-medium tabular-nums text-ink">
                  {loading
                    ? "..."
                    : balance === null
                      ? "—"
                      : balance.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          )}
        </div>

        {insufficient && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">Saldo insuficiente</div>
              <div className="mt-0.5 text-amber-700">
                Você precisa de pelo menos {estimate} créditos pra gerar essa
                prova.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {insufficient ? (
            <Button asChild variant="primary" size="md">
              <Link href="/app/billing">Ver créditos</Link>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  onOpenChange(false);
                  void onConfirm();
                }}
              >
                <Sparkles className="size-4" strokeWidth={2.5} />
                Gerar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Aproximação client-side da fórmula do backend. Overestima pra o dialog
 * não parecer otimista demais e o usuário se surpreender com o débito real.
 */
export function estimateCreditsClient(input: {
  materialChars: number;
  questionCount: number;
}): number {
  const inputTokens = Math.ceil(input.materialChars / 4);
  const outputTokens = input.questionCount * 150;
  return Math.max(1, Math.ceil((inputTokens + outputTokens) / 100));
}
