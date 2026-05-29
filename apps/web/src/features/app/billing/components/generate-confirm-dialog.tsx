"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Coins, Loader2, Sparkles } from "lucide-react";
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
  /**
   * Custo exato em créditos vindo do backend (POST /v1/ai/estimate). É o
   * mesmo valor que será debitado. `null` cobre dois casos: ainda carregando
   * OU a chamada falhou. Use `estimateLoading` pra distinguir.
   */
  estimate: number | null;
  /** True enquanto o fetch de custo está em voo. */
  estimateLoading: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Mostrado antes de gerar prova. Duas variantes:
 *
 *   - Professor avulso: busca saldo pessoal e pré-valida contra a estimativa.
 *   - Professor institucional em pool/pay_per_use/unlimited: esconde saldo
 *     pessoal (não é fonte do débito), mostra "Pago pela instituição". O
 *     check real continua no backend — aqui é só transparência.
 *
 * Quando a estimativa falha (estimate=null, !estimateLoading) ou está
 * carregando, não bloqueamos por saldo — o backend faz o check definitivo.
 */
export function GenerateConfirmDialog({
  open,
  onOpenChange,
  estimate,
  estimateLoading,
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
        setOrgPays(
          mode === "pool" || mode === "pay_per_use" || mode === "unlimited",
        );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [open]);

  // Só bloqueamos por saldo quando temos os dois números: estimativa
  // confirmada (não nula) e saldo pessoal (não em modo institucional).
  // Estimativa carregando ou indisponível → libera, backend pega.
  const insufficient =
    !orgPays && balance !== null && estimate !== null && balance < estimate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar geração</DialogTitle>
          <DialogDescription>
            Este é o custo exato da geração — será debitado apenas se a prova
            for gerada com sucesso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 px-5 py-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Custo
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <CostValue
                estimate={estimate}
                loading={estimateLoading}
              />
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

        {insufficient && estimate !== null && (
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

        {!estimateLoading && estimate === null && (
          <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-gray-500" />
            <div>
              <div className="font-medium">Custo indisponível</div>
              <div className="mt-0.5 text-gray-600">
                Não conseguimos calcular o custo agora. Você ainda pode gerar
                — o valor é definido pela configuração da prova.
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
                disabled={estimateLoading}
                onClick={() => {
                  onOpenChange(false);
                  void onConfirm();
                }}
              >
                {estimateLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" strokeWidth={2.5} />
                )}
                Gerar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CostValue({
  estimate,
  loading,
}: {
  estimate: number | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-2xl font-medium tabular-nums text-gray-400">
        <Loader2 className="size-4 animate-spin" />
        calculando…
      </span>
    );
  }
  if (estimate === null) {
    return (
      <>
        <span className="text-2xl font-medium tabular-nums text-gray-400">
          —
        </span>
        <span className="text-xs text-gray-500">créditos</span>
      </>
    );
  }
  return (
    <>
      <span className="text-2xl font-medium tabular-nums text-ink">
        {estimate.toLocaleString("pt-BR")}
      </span>
      <span className="text-xs text-gray-500">créditos</span>
    </>
  );
}
