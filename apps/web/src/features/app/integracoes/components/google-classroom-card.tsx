"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleClassroomLogo } from "./integration-logos";
import {
  connectClassroomAction,
  disconnectClassroomAction,
} from "../actions";
import type { ClassroomStatusDTO } from "../types";

interface GoogleClassroomCardProps {
  status: ClassroomStatusDTO;
}

export function GoogleClassroomCard({ status }: GoogleClassroomCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setBusy(true);
    const result = await connectClassroomAction();
    if (result.ok && result.data) {
      // Sai do app pro consentimento do Google; volta no callback.
      window.location.href = result.data.url;
      return;
    }
    setError(result.error?.message ?? "Não foi possível iniciar a conexão.");
    setBusy(false);
  }

  async function handleDisconnect() {
    setError(null);
    setBusy(true);
    const result = await disconnectClassroomAction();
    setBusy(false);
    if (result.ok) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error?.message ?? "Não foi possível desconectar.");
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <GoogleClassroomLogo className="size-10 shrink-0" />
          <div className="flex flex-col leading-tight">
            <h3 className="text-[15px] font-medium tracking-tight text-ink">
              Google Classroom
            </h3>
            <span className="text-xs text-gray-400">
              {status.connected ? "Conectado" : "Não conectado"}
            </span>
          </div>
        </div>
        {status.connected && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            ativo
          </span>
        )}
      </header>

      <p className="text-[13px] leading-relaxed text-gray-500">
        Importe suas turmas e alunos do Google Classroom e mantenha tudo
        sincronizado por e-mail.
      </p>

      {status.connected && status.googleEmail && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 text-[13px] text-gray-600">
          Conta vinculada:{" "}
          <span className="font-medium text-ink">{status.googleEmail}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {status.connected ? (
          <>
            <Button asChild variant="primary" size="md">
              <Link href="/app/integracoes/classroom">
                Gerenciar turmas
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleDisconnect}
              disabled={busy}
            >
              {busy ? "..." : "Desconectar"}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleConnect}
            disabled={busy}
          >
            {busy ? "Conectando..." : "Conectar"}
          </Button>
        )}
      </div>
    </div>
  );
}
