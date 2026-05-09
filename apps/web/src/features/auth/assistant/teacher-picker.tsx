"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserCircle2 } from "lucide-react";
import { buildDisplayUser } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AssistantTeacherDTO } from "./data";

interface SelfUser {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  teachers: AssistantTeacherDTO[];
  /**
   * Dados do auxiliar logado. Se passado, renderiza um card extra "Entre
   * na sua conta" antes da lista de professores — chama
   * /v1/iam/assistant/select-self pra carimbar o cookie apontando pro
   * próprio user e o /app deixa passar.
   */
  selfUser?: SelfUser;
}

/**
 * Seletor de conta — única tela quando o auxiliar está logado mas
 * ainda não escolheu o que fazer. Cada card chama o endpoint que seta
 * o cookie HMAC e redireciona pro `/app`.
 */
export function TeacherPicker({ teachers, selfUser }: Props) {
  const router = useRouter();
  // "self" = botão da própria conta; <id> = teacherUserId selecionado.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(teacherUserId: string) {
    setError(null);
    setPendingKey(teacherUserId);
    try {
      const res = await fetch("/v1/iam/assistant/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teacherUserId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Não foi possível selecionar.");
      }
      router.refresh();
      router.replace("/app");
    } catch (err) {
      setError((err as Error).message);
      setPendingKey(null);
    }
  }

  async function pickSelf() {
    setError(null);
    setPendingKey("self");
    try {
      const res = await fetch("/v1/iam/assistant/select-self", {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Não foi possível entrar.");
      }
      router.refresh();
      router.replace("/app");
    } catch (err) {
      setError((err as Error).message);
      setPendingKey(null);
    }
  }

  if (teachers.length === 0 && !selfUser) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
        <p className="text-sm font-medium text-ink">
          Nenhum professor disponível.
        </p>
        <p className="mt-2 max-w-md text-[13px] text-gray-500">
          Sua conta não está vinculada a nenhum professor no momento. Fale com
          o administrador da instituição.
        </p>
      </div>
    );
  }

  const selfDisplay = selfUser
    ? buildDisplayUser({
        name: selfUser.name,
        email: selfUser.email,
        fallback: "email",
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {selfUser && selfDisplay && (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400">
            Entre na sua conta
          </div>
          <button
            type="button"
            onClick={pickSelf}
            disabled={pendingKey !== null}
            className={cn(
              "group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 text-left transition-colors",
              "hover:border-brand-primary hover:bg-brand-primary/5",
              pendingKey !== null && pendingKey !== "self" && "opacity-50",
            )}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-dark-01 text-base font-semibold text-white">
              {selfDisplay.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-medium text-ink">
                {selfDisplay.name}
              </div>
              <div className="truncate text-[13px] text-gray-500">
                {selfUser.email}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">Sua conta</div>
            </div>
            {pendingKey === "self" ? (
              <Loader2 className="size-5 animate-spin text-brand-primary" />
            ) : (
              <UserCircle2 className="size-5 text-gray-300 transition-colors group-hover:text-brand-primary" />
            )}
          </button>
        </div>
      )}

      {teachers.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400">
            {selfUser
              ? "Ou em uma conta que você atende"
              : "Em uma conta que você atende"}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {teachers.map((t) => {
              const display = buildDisplayUser({
                name: t.teacherName,
                email: t.teacherEmail,
                fallback: "email",
              });
              const isPending = pendingKey === t.teacherUserId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.teacherUserId)}
                  disabled={pendingKey !== null}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 text-left transition-colors",
                    "hover:border-brand-primary hover:bg-brand-primary/5",
                    pendingKey !== null &&
                      pendingKey !== t.teacherUserId &&
                      "opacity-50",
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-base font-semibold text-white">
                    {display.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-medium text-ink">
                      {display.name}
                    </div>
                    <div className="truncate text-[13px] text-gray-500">
                      {t.teacherEmail}
                    </div>
                    {t.organizationName && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <Building2 className="size-3" />
                        {t.organizationName}
                      </div>
                    )}
                  </div>
                  {isPending ? (
                    <Loader2 className="size-5 animate-spin text-brand-primary" />
                  ) : (
                    <UserCircle2 className="size-5 text-gray-300 transition-colors group-hover:text-brand-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[12px] text-gray-400">
        Você pode trocar de conta a qualquer momento pelo menu do seu perfil
        no canto superior direito.
      </p>
    </div>
  );
}

export function PickerLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace("/sign-in");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={logout}
      disabled={loggingOut}
    >
      {loggingOut ? "Saindo..." : "Sair"}
    </Button>
  );
}
