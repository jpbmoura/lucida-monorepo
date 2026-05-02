"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteExpenseAction } from "../data";

interface ExpenseRowActionsProps {
  expenseId: string;
  description: string;
}

// Mesmo padrão de UX do RevokeButton da tela de Acessos: idle → confirm
// inline, sem modal. Espera o transition antes de revertir.
export function ExpenseRowActions({
  expenseId,
  description,
}: ExpenseRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteExpenseAction(expenseId);
      if (!result.ok) {
        setError(result.message ?? "Falha ao remover.");
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-pill border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700"
        title={error}
      >
        {error}
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1 rounded-pill border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50",
          )}
        >
          <Trash2 className="size-3" />
          {isPending ? "..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-pill px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:text-ink disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setError(null);
        setConfirming(true);
      }}
      aria-label={`Remover despesa ${description}`}
      className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700"
    >
      <Trash2 className="size-3" />
      Remover
    </button>
  );
}
