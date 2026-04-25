import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface EmailMismatchCardProps {
  inviteEmail: string;
  currentEmail: string;
}

export function EmailMismatchCard({
  inviteEmail,
  currentEmail,
}: EmailMismatchCardProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-soft">
      <span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
        <AlertCircle className="size-5" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          Este convite não é para você
        </h1>
        <p className="text-sm leading-relaxed text-gray-500">
          O convite foi enviado para{" "}
          <span className="font-medium text-ink">{inviteEmail}</span>, mas você
          está logado como{" "}
          <span className="font-medium text-ink">{currentEmail}</span>.
          <br />
          Saia da conta atual e entre com o e-mail do convite, ou crie uma
          conta se ainda não tiver.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-pill bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
        >
          Entrar com outro e-mail
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-pill border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-ink"
        >
          Ir para meu painel
        </Link>
      </div>
    </div>
  );
}
