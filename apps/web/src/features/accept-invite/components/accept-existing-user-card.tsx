"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface AcceptExistingUserCardProps {
  invitationId: string;
  organizationName: string;
  inviterName: string;
  userName: string;
}

/**
 * Cenário: user já está logado e o email dele bate com o do convite. Só
 * precisa clicar pra virar member. BA cuida do setActive não é chamado
 * aqui — o destino é /app (professor), não /analytics.
 */
export function AcceptExistingUserCard({
  invitationId,
  organizationName,
  inviterName,
  userName,
}: AcceptExistingUserCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setError(null);
    setPending(true);
    const res = await authClient.organization.acceptInvitation({ invitationId });
    setPending(false);
    if (res.error) {
      setError(res.error.message ?? "Não foi possível aceitar o convite.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-10 shadow-soft">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-primary">
          <span className="pulse-dot" aria-hidden />
          Convite
        </span>
        <h1 className="text-3xl font-medium leading-[1.05] tracking-tight text-ink">
          Olá,{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            {firstName(userName)}
          </span>
          .
        </h1>
        <p className="text-sm leading-relaxed text-gray-500">
          Você foi convidado por <span className="font-medium text-ink">{inviterName}</span>{" "}
          para entrar na instituição{" "}
          <span className="font-medium text-ink">{organizationName}</span>.
        </p>
      </div>

      <ul className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm text-gray-600">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          Você continua usando o Lucida Exam como sempre.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          A instituição passa a acompanhar suas turmas e provas num painel.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          Suas turmas, provas e alunos continuam sendo seus.
        </li>
      </ul>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={handleAccept}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Aceitando..." : "Aceitar convite"}
        {!pending && <ArrowRight />}
      </Button>
    </div>
  );
}

function firstName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[0] ?? full;
}
