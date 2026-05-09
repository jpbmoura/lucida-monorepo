"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, Map, Repeat, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  name: string;
  email: string;
  initials: string;
  /**
   * True quando o user real é auxiliar de pelo menos um professor.
   * Habilita o item "Trocar conta" — o único caminho na UI pra ele
   * voltar pro /auxiliar/escolher e alternar entre a própria conta e
   * as contas dos professores que atende.
   */
  isAssistant?: boolean;
}

export function ProfileMenu({
  name,
  email,
  initials,
  isAssistant = false,
}: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    });
  }

  async function handleSwitchAccount() {
    setIsSwitching(true);
    try {
      // `clear` zera o cookie de target — o /app vai detectar
      // (availableTeachers > 0 && !target && !selfMode) e mandar pro
      // /auxiliar/escolher. Faz o redirect manual também pra cobrir o
      // caso de o user já estar fora do /app.
      await fetch("/v1/iam/assistant/clear", { method: "POST" });
      router.refresh();
      router.replace("/auxiliar/escolher");
    } finally {
      // Mantém o spinner até a navegação consolidar — replace dispara
      // o unmount, então não precisa zerar o estado.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-pill py-1 pl-1 pr-3 transition-colors",
          open ? "bg-gray-100" : "hover:bg-gray-100",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-dark-01 text-[12px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-[13px] font-medium text-ink md:inline">{name}</span>
        <ChevronDown className="hidden size-3.5 text-gray-400 md:inline" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-pop"
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="truncate text-sm font-medium text-ink">{name}</div>
              <div className="mt-0.5 truncate text-xs text-gray-500">{email}</div>
            </div>
            <div className="flex flex-col py-1">
              <Link
                href="/app/configuracoes"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
              >
                <Settings className="size-4" />
                Configurações
              </Link>
              <Link
                href="/roadmap"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-ink"
              >
                <Map className="size-4" />
                Roadmap
              </Link>
              {isAssistant && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSwitchAccount}
                  disabled={isSwitching}
                  className="flex items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink disabled:opacity-50"
                >
                  <Repeat className="size-4" />
                  {isSwitching ? "Trocando..." : "Trocar conta"}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={isPending}
                className="flex items-center gap-2.5 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-ink disabled:opacity-50"
              >
                <LogOut className="size-4" />
                {isPending ? "Saindo..." : "Sair"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
