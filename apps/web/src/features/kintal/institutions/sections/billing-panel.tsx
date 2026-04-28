"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Infinity as InfinityIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  adjustOrgCreditsAction,
  updateInstitutionBillingAction,
} from "../data";
import { BILLING_MODE_INFO } from "../billing-mode-info";
import type { KintalInstitutionDetail, OrgBillingMode } from "../types";

const SELECTABLE_MODES: OrgBillingMode[] = ["unlimited", "pool"];

interface Props {
  institution: KintalInstitutionDetail;
}

export function BillingPanel({ institution }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentMode = institution.billingMode ?? "pool";
  const unlimited = institution.billingMode === "unlimited";

  function handleModeChange(mode: OrgBillingMode) {
    if (mode === currentMode) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateInstitutionBillingAction(institution.id, mode);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSuccess(`Modo alterado para ${BILLING_MODE_INFO[mode].label}.`);
      router.refresh();
    });
  }

  // ─── Recarregar créditos ─────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [note, setNote] = useState("");

  function handleCreditsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = Number.parseInt(amount, 10);
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError("Quantidade precisa ser inteiro não-zero.");
      return;
    }
    const expires = expiresIn ? Number.parseInt(expiresIn, 10) : null;
    startTransition(async () => {
      const res = await adjustOrgCreditsAction(institution.id, parsed, {
        expiresInDays: expires && expires > 0 ? expires : null,
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSuccess(
        parsed > 0
          ? `+${parsed.toLocaleString("pt-BR")} créditos adicionados.`
          : `${parsed.toLocaleString("pt-BR")} créditos removidos.`,
      );
      setAmount("");
      setExpiresIn("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Cobrança
        </div>
        <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">
          Plano e saldo
        </h2>
      </header>

      <div className="rounded-2xl bg-gray-50/60 p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Saldo atual
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          {unlimited ? (
            <>
              <InfinityIcon className="size-7 text-brand-primary" />
              <span className="text-3xl font-medium tracking-tighter text-ink">
                Ilimitado
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-medium tabular-nums tracking-tighter text-ink">
                {institution.creditBalance.toLocaleString("pt-BR")}
              </span>
              <span className="text-sm text-gray-400">créditos</span>
            </>
          )}
        </div>
        <p className="mt-2 text-[12px] text-gray-500">
          {unlimited
            ? "Modo cortesia — consumo não diminui saldo, mas é registrado no ledger."
            : "Soma das wallets ativas (não expiradas) da instituição."}
        </p>
      </div>

      {/* Modo de cobrança */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Modo de cobrança
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {SELECTABLE_MODES.map((mode) => {
            const info = BILLING_MODE_INFO[mode];
            const selected = currentMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                disabled={isPending}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-gray-100 bg-white hover:border-gray-200",
                  isPending && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-ink">
                    {info.label}
                  </div>
                  {selected && (
                    <Check className="size-4 text-brand-primary" strokeWidth={3} />
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-gray-500">
                  {info.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recarregar créditos */}
      {!unlimited && (
        <form
          onSubmit={handleCreditsSubmit}
          className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            Ajustar créditos
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
            <div>
              <Label htmlFor="amount">Quantidade</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="Ex: 10000 (positivo) ou -500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Positivo credita. Negativo debita.
              </p>
            </div>
            <div>
              <Label htmlFor="expires">Validade (dias)</Label>
              <Input
                id="expires"
                type="number"
                inputMode="numeric"
                placeholder="Vazio = nunca expira"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">Justificativa (opcional)</Label>
            <Input
              id="note"
              placeholder="Ex: acordo comercial Q2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending}
            className="self-start"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              "Aplicar ajuste"
            )}
          </Button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}
    </section>
  );
}
