"use client";

import { useTransition } from "react";
import { ShieldAlert, X } from "lucide-react";
import { stopImpersonateAction } from "../actions";
import { stopKintalImpersonateAction } from "@/features/kintal/impersonate/actions";
import type { ImpersonateMode } from "@/lib/impersonate-state";

interface ImpersonateBannerProps {
  /** Nome do user que está sendo impersonado. */
  actingAsName: string;
  /** Email do user — mostrado em telas largas pra confirmar identidade. */
  actingAsEmail: string;
  /**
   * Origem do impersonate. `org-admin` = admin de instituição encerra
   * voltando pra `/analytics` (action analytics). `staff` = staff Kintal
   * encerra voltando pro detalhe do user (action kintal, com audit log).
   */
  mode: ImpersonateMode;
  /**
   * `targetUserId` (= `actingAs.id`). Em modo staff, usado pra montar o
   * redirect de volta pra `/kintal/usuarios/[id]`. Em modo org-admin é
   * ignorado.
   */
  targetUserId: string;
}

/**
 * Banner full-width amarelo no topo do `/app` quando o user está
 * impersonando outro user. Suporta os dois modos: org admin (volta pra
 * `/analytics`) e staff Kintal (volta pra `/kintal/usuarios/[id]` e
 * fecha audit log).
 */
export function ImpersonateBanner({
  actingAsName,
  actingAsEmail,
  mode,
  targetUserId,
}: ImpersonateBannerProps) {
  const [pending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      // Server action faz o redirect — nada a fazer aqui.
      if (mode === "staff") {
        await stopKintalImpersonateAction(`/kintal/usuarios/${targetUserId}`);
      } else {
        await stopImpersonateAction();
      }
    });
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-5 py-2.5 md:px-10"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <ShieldAlert className="size-4 shrink-0 text-amber-700" />
        <div className="min-w-0 text-[13px] text-amber-900">
          Você está atuando como{" "}
          <strong className="font-medium">{actingAsName}</strong>
          <span className="ml-1 hidden text-amber-700 md:inline">
            ({actingAsEmail})
          </span>
          . Suas ações ficam atribuídas a ele.
        </div>
      </div>

      <button
        type="button"
        onClick={handleStop}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-amber-300 bg-white px-3 py-1 text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
      >
        <X className="size-3.5" />
        {pending ? "Saindo..." : "Sair de impersonate"}
      </button>
    </div>
  );
}
