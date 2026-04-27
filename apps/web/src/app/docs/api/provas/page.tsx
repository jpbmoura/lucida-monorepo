import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { Callout } from "@/features/docs/components/callout";
import { MethodBadge } from "@/features/docs/components/method-badge";
import { ScopeBadge } from "@/features/docs/components/scope-badge";

export const metadata: Metadata = { title: "Provas · API" };

interface ResourceEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  label: string;
  description: string;
  href: string;
  scope: string;
}

const ENDPOINTS: ResourceEndpoint[] = [
  {
    method: "POST",
    path: "/v1/public/exams/:id/share-link",
    label: "Gerar link da prova",
    description:
      "Cria link assinado pra um aluno entrar direto, sem precisar do código.",
    href: "/docs/api/provas/gerar-link",
    scope: "exams:share",
  },
];

export default function ProvasOverviewPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
          <Eyebrow>Referência · Provas</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            O recurso{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              Provas
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Provas são criadas pelos professores no painel da Lucida — a
            API pública não cria provas (nessa fase). O que ela faz é gerar{" "}
            <strong className="text-ink">links pré-preenchidos</strong> pra
            que um aluno específico responda uma prova já publicada, sem
            precisar digitar o código de 7 dígitos.
          </p>
        </header>

        {/* Como funciona o link */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Como funciona o link
            </h2>
          </div>
          <ol className="ml-4 flex list-decimal flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
            <li>
              Sua integração chama{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
                POST /v1/public/exams/:id/share-link
              </code>{" "}
              passando a <strong className="text-ink">matrícula</strong> do
              aluno.
            </li>
            <li>
              A Lucida resolve a matrícula → studentId, valida que o aluno
              é da mesma turma da prova, e emite um token assinado
              (HMAC-SHA256).
            </li>
            <li>
              A resposta traz uma <code>url</code> pronta no formato{" "}
              <code>/exam/:shareId/start/:token</code>. Você envia esse link
              ao aluno.
            </li>
            <li>
              O aluno abre o link e vê uma tela de boas-vindas com o nome
              dele já validado — só precisa clicar "Começar prova". O
              campo de código <strong>não aparece</strong>.
            </li>
          </ol>
        </section>

        {/* Características do token */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Características do token
            </h2>
          </div>
          <ul className="ml-4 flex list-disc flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
            <li>
              <strong className="text-ink">Sem expiração:</strong> o link
              vale enquanto a prova existir e não tiver sido entregue por
              esse aluno.
            </li>
            <li>
              <strong className="text-ink">Reusável:</strong> se o aluno
              fechar o navegador antes de terminar, abrir o mesmo link
              retoma a sessão de onde parou.
            </li>
            <li>
              <strong className="text-ink">Assinado, não criptografado:</strong>{" "}
              o conteúdo (examId, studentId) é visível em base64; a
              assinatura impede modificação. Não envie o link por canais
              menos confiáveis que e-mail/SMS institucionais.
            </li>
            <li>
              <strong className="text-ink">Bloqueio do aluno:</strong> a
              identidade do aluno fica fixada. O link não pode ser
              reaproveitado pra outro estudante.
            </li>
          </ul>
        </section>

        <Callout tone="info" title="Sobre as outras operações">
          Listagem, criação e edição de provas via API pública vão chegar
          numa fase futura. Hoje provas só são criadas pelo painel da
          Lucida — a API pública só gera o link de execução pra um aluno.
        </Callout>

        {/* Endpoints */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Endpoints
            </h2>
          </div>

          <ul className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {ENDPOINTS.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/60"
                >
                  <MethodBadge method={e.method} />
                  <code className="hidden font-mono text-[13px] text-gray-700 md:inline">
                    {e.path}
                  </code>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:ml-4">
                    <span className="text-[14px] font-medium text-ink">
                      {e.label}
                    </span>
                    <span className="text-[12.5px] text-gray-500">
                      {e.description}
                    </span>
                  </div>
                  <ScopeBadge scope={e.scope} className="hidden md:inline-flex" />
                  <ArrowRight className="size-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
