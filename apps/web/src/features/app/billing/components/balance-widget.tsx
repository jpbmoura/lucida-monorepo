"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BALANCE_CHANGED_EVENT = "lucida:balance-changed";

/** Dispara em qualquer lugar do client-side pra forçar refresh do widget. */
export function notifyBalanceChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BALANCE_CHANGED_EVENT));
  }
}

export function BalanceWidget({ initial }: { initial: number | null }) {
  const [balance, setBalance] = useState<number | null>(initial);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/v1/billing/balance", { cache: "no-store" });
      if (!res.ok) return;
      const { data } = (await res.json()) as { data: { total: number } };
      setBalance(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onChanged = () => {
      void fetchBalance();
    };
    const onFocus = () => {
      void fetchBalance();
    };
    window.addEventListener(BALANCE_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(BALANCE_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchBalance]);

  const displayed = balance ?? 0;
  const low = balance !== null && balance < 50;

  return (
    <Link
      href="/app/billing"
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
        low
          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-gray-200 bg-white text-ink hover:border-gray-300 hover:bg-gray-50",
      )}
      aria-label="Saldo de créditos"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin text-gray-400" />
      ) : (
        <Coins
          className={cn(
            "size-3.5",
            low ? "text-amber-600" : "text-gray-500",
          )}
        />
      )}
      {balance === null ? "—" : displayed.toLocaleString("pt-BR")}
      <span
        className={cn(
          "text-[11px] font-normal",
          low ? "text-amber-700" : "text-gray-500",
        )}
      >
        créditos
      </span>
    </Link>
  );
}
