"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface KintalProfileMenuProps {
  name: string;
  email: string;
  initials: string;
}

// Mesmo shape dos ProfileMenu de /app e /analytics — avatar + nome +
// dropdown. Cor do avatar muda pra gradient preto→cinza (sem azul/roxo) e
// o "Sair" volta pra /kintal/entrar, que é o sign-in próprio do backoffice.
// Sem link de "Configurações" porque a rota ainda não existe no Kintal.
export function KintalProfileMenu({
  name,
  email,
  initials,
}: KintalProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/kintal/entrar");
      router.refresh();
    });
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
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[12px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-[13px] font-medium text-ink md:inline">
          {name}
        </span>
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
              <div className="mt-0.5 truncate text-xs text-gray-500">
                {email}
              </div>
            </div>
            <div className="flex flex-col py-1">
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
