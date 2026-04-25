import Link from "next/link";
import { Building2 } from "lucide-react";

/**
 * Estado raro — a sessão não tem `activeOrganizationId` setada, então o
 * backend devolveu 400 MISSING_ACTIVE_ORGANIZATION. Normalmente o form de
 * login institucional chama `setActive` logo após autenticar, então o user
 * que acaba caindo aqui é:
 *
 *  1. Um professor comum (/app) que entrou em /analytics via URL direta
 *     sem ser member de nenhuma org.
 *  2. Uma sessão antiga anterior ao deploy do setActive, antes do re-login.
 *
 * Em ambos os casos, o caminho correto é voltar e entrar via
 * /organizacoes/entrar.
 */
export function NoActiveOrg() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-analytics-primary/10 text-analytics-primary">
        <Building2 className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-medium tracking-tight text-ink">
          Sem instituição ativa na sessão
        </h2>
        <p className="text-sm leading-relaxed text-gray-500">
          Entre pelo login de instituição para ativar o contexto correto. Se
          você é apenas professor, volte ao painel pessoal.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/organizacoes/entrar"
          className="inline-flex items-center justify-center rounded-pill bg-analytics-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-analytics-dark-01"
        >
          Entrar como instituição
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-pill border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-ink"
        >
          Ir para o painel pessoal
        </Link>
      </div>
    </section>
  );
}
