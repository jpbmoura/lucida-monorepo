import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TokenErrorProps {
  examTitle: string;
  shareId: string;
  message: string;
}

/**
 * Tela exibida quando o link da prova é inválido (token adulterado,
 * matrícula não encontrada, aluno em outra turma). Sempre dá fallback
 * pro fluxo via código pra que o aluno consiga entrar mesmo se o link
 * institucional estiver quebrado.
 */
export function TokenError({ examTitle, shareId, message }: TokenErrorProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-12 md:px-0">
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-red-600">
          <TriangleAlert className="size-3.5" />
          Link inválido
        </div>
        <h1 className="text-2xl font-medium leading-tight tracking-tight text-ink md:text-3xl">
          {examTitle}
        </h1>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <p className="text-[14px] leading-relaxed text-red-900">{message}</p>
        <p className="text-[13px] leading-relaxed text-gray-600">
          Você ainda pode entrar usando o código de 7 dígitos enviado pela
          professora — ele continua funcionando mesmo se o link
          institucional falhar.
        </p>
        <Button asChild variant="primary" size="md" className="w-fit">
          <Link href={`/exam/${encodeURIComponent(shareId)}`}>
            Entrar com código
          </Link>
        </Button>
      </div>
    </div>
  );
}
