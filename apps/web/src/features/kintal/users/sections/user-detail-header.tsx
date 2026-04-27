import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildDisplayUser } from "@/lib/user-display";
import { PLAN_LABELS, type KintalUserDetail } from "../types";

interface UserDetailHeaderProps {
  user: KintalUserDetail;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  const display = buildDisplayUser({ name: user.name, email: user.email });
  const isStaff = user.role === "staff";

  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8">
      <Link
        href="/kintal/usuarios"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-gray-400 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Voltar pra lista
      </Link>

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-end gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-lg font-semibold text-white">
            {display.initials}
          </span>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
              <span className="pulse-dot" />
              Cliente
              {isStaff && (
                <span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] tracking-[0.08em] text-gray-500">
                  Staff
                </span>
              )}
            </div>
            <h1 className="truncate text-3xl font-medium leading-[1.05] tracking-tighter text-ink md:text-[2.5rem]">
              {display.name}
            </h1>
            <p className="mt-1 truncate text-[13px] text-gray-500">
              {user.email}
              {!user.emailVerified && (
                <span className="ml-2 rounded-pill bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">
                  não verificado
                </span>
              )}
            </p>
          </div>
        </div>

        {user.subscription ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-right">
            <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
              Plano atual
            </div>
            <div className="mt-1 text-base font-medium text-ink">
              {PLAN_LABELS[user.subscription.planId] ?? user.subscription.planId}
            </div>
            <div className="text-xs capitalize text-gray-500">
              {user.subscription.status}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-4 text-right">
            <div className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
              Plano atual
            </div>
            <div className="mt-1 text-base font-medium text-gray-400">
              Sem assinatura
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
