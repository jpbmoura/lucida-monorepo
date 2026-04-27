"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInt } from "@/features/kintal/dashboard/format";
import { adjustUserCreditsAction } from "../data";
import { SOURCE_LABELS, type KintalUserDetail } from "../types";

interface CreditsPanelProps {
  user: KintalUserDetail;
}

type Mode = "add" | "remove";

export function CreditsPanel({ user }: CreditsPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("add");
  const [rawAmount, setRawAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setRawAmount("");
    setNote("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = Number.parseInt(rawAmount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Informe um número inteiro maior que zero.");
      return;
    }
    const signed = mode === "add" ? parsed : -parsed;

    startTransition(async () => {
      const result = await adjustUserCreditsAction(
        user.id,
        signed,
        note.trim() || undefined,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(
        mode === "add"
          ? `Adicionou ${formatInt(parsed)} créditos. Saldo: ${formatInt(result.newBalance)}.`
          : `Removeu ${formatInt(parsed)} créditos. Saldo: ${formatInt(result.newBalance)}.`,
      );
      reset();
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Créditos da{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              conta
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Saldo total e ajuste manual com auditoria no ledger.
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {formatInt(user.creditBalance)}
          </div>
          <div className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-gray-400">
            créditos disponíveis
          </div>
        </div>
      </div>

      {user.walletBreakdown.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-2 border-t border-gray-100 pt-5 sm:grid-cols-2">
          {user.walletBreakdown.map((w, i) => (
            <div
              key={`${w.source}-${i}`}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
            >
              <div>
                <div className="text-xs font-medium text-ink">
                  {SOURCE_LABELS[w.source] ?? w.source}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {w.expiresAt
                    ? `expira ${new Date(w.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}`
                    : "não expira"}
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums text-ink">
                {formatInt(w.balance)}
              </span>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 border-t border-gray-100 pt-5"
        noValidate
      >
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="credit-amount">Quantidade</Label>
            <Input
              id="credit-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="0"
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              disabled={isPending}
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="credit-note">Justificativa (opcional)</Label>
            <Input
              id="credit-note"
              placeholder="Ex: cortesia por bug, devolução de plano cancelado..."
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

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

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending || !rawAmount}
            className="hover:!bg-gray-800"
          >
            {isPending
              ? "Aplicando..."
              : mode === "add"
                ? "Adicionar créditos"
                : "Remover créditos"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange("add")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "add"
            ? "bg-white text-ink shadow-soft"
            : "text-gray-500 hover:text-ink",
        )}
      >
        <Plus className="size-3.5" />
        Adicionar
      </button>
      <button
        type="button"
        onClick={() => onChange("remove")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "remove"
            ? "bg-white text-ink shadow-soft"
            : "text-gray-500 hover:text-ink",
        )}
      >
        <Minus className="size-3.5" />
        Remover
      </button>
    </div>
  );
}
