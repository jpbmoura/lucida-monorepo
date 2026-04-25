"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { revokeStaffAction } from "../data";

interface RevokeButtonProps {
  userId: string;
  /** Nome/email exibido no confirm — contexto pra não apagar errado. */
  label: string;
  /** True quando a linha é do próprio user logado. Desativa o botão. */
  disabled?: boolean;
}

// Botão compacto de "Remover acesso". Dois estados: idle e confirm —
// clicar no idle mostra o confirm inline (sem dialog modal, igual muito
// admin panel); clicar de novo confirma. Escape/blur volta pro idle.
export function RevokeButton({ userId, label, disabled }: RevokeButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleIdleClick() {
    if (disabled) return;
    setError(null);
    setConfirming(true);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await revokeStaffAction(userId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  if (disabled) {
    return (
      <span
        title="Você não pode remover seu próprio acesso."
        className="inline-flex items-center gap-1.5 rounded-pill border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-300"
      >
        <Trash2 className="size-3.5" />
        Você
      </span>
    );
  }

  if (error) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-pill border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
        title={error}
      >
        {error}
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50",
          )}
        >
          <Trash2 className="size-3.5" />
          {isPending ? "Removendo..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-pill px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-ink disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleIdleClick}
      aria-label={`Remover acesso de ${label}`}
      className="inline-flex items-center gap-1.5 rounded-pill border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
    >
      <Trash2 className="size-3.5" />
      Remover
    </button>
  );
}
