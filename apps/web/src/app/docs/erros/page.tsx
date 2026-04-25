import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import {
  StatusCodeTable,
  type StatusCode,
} from "@/features/docs/components/status-code-table";
import { Callout } from "@/features/docs/components/callout";
import { PageWithToc } from "@/features/docs/components/page-with-toc";
import type { TocItem } from "@/features/docs/components/docs-toc";

export const metadata: Metadata = { title: "Erros" };

const TOC: TocItem[] = [
  { id: "formato", title: "Formato do corpo" },
  { id: "codigos", title: "Códigos HTTP" },
  { id: "retry", title: "Política de retry" },
];

const STATUS_CODES: StatusCode[] = [
  {
    code: 200,
    name: "OK",
    description: "Sucesso. Corpo contém { data, ... }.",
  },
  {
    code: 201,
    name: "Created",
    description:
      "Sucesso em criação (POST). Corpo contém o recurso recém-criado.",
  },
  {
    code: 204,
    name: "No Content",
    description:
      "Sucesso sem corpo (comum em DELETE e PATCH que não precisam devolver recurso).",
  },
  {
    code: 400,
    name: "Bad Request",
    description:
      "Requisição malformada — JSON inválido, faltando campo obrigatório ou tipo errado. Verifique o corpo antes de retentar.",
  },
  {
    code: 401,
    name: "Unauthorized",
    description: (
      <>
        Header <code>Authorization</code> ausente, malformado ou com
        chave revogada/inválida. <strong>Não retry</strong>.
      </>
    ),
  },
  {
    code: 402,
    name: "Payment Required",
    description: (
      <>
        Instituição sem créditos pra operação (apenas em chamadas{" "}
        <code>live</code> que debitam). Admin precisa adicionar saldo no
        painel pra destravar.
      </>
    ),
  },
  {
    code: 403,
    name: "Forbidden",
    description:
      "A chave é válida mas não tem o escopo necessário. Corrija criando uma nova chave com os escopos certos.",
  },
  {
    code: 404,
    name: "Not Found",
    description:
      "Recurso não existe ou não pertence à organização da chave (nunca vazamos existência cross-org).",
  },
  {
    code: 409,
    name: "Conflict",
    description:
      "Estado conflitante — ex.: criar recurso com identificador já em uso, editar item já deletado. Pode ser retentado após inspeção.",
  },
  {
    code: 422,
    name: "Unprocessable Entity",
    description: (
      <>
        Corpo parseia como JSON mas não passa na validação de domínio
        (ex.: nome de turma duplicado na mesma série). A mensagem em{" "}
        <code>issues</code> descreve os campos problemáticos.
      </>
    ),
  },
  {
    code: 429,
    name: "Too Many Requests",
    description: (
      <>
        Rate limit da chave estourado. Respeite o header{" "}
        <code>Retry-After</code> (em segundos) antes de retentar.
      </>
    ),
  },
  {
    code: 500,
    name: "Internal Server Error",
    description:
      "Erro inesperado do nosso lado. Pode retentar com backoff exponencial. Se persistir, reporte pro suporte com o requestId do header.",
  },
  {
    code: 503,
    name: "Service Unavailable",
    description:
      "Janela de manutenção ou dependência externa indisponível. Retente com backoff.",
  },
];

export default function ErrosPage() {
  return (
    <PageWithToc tocItems={TOC}>
        <header className="hero-aura-analytics flex flex-col gap-4 border-b border-gray-100 pb-8">
          <Eyebrow>Fundamentos</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-[2.75rem]">
            Códigos e{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              formato
            </span>{" "}
            de erros
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Todas as respostas de erro seguem o mesmo formato e o mesmo
            conjunto de códigos HTTP — dá pra tratar tudo num handler
            centralizado na sua aplicação.
          </p>
        </header>

        {/* Formato */}
        <section id="formato" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Formato do corpo</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Erros sempre retornam JSON com <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">code</code>{" "}
            (identificador estável) e <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">message</code>{" "}
            (legível em pt-BR). Alguns códigos de validação trazem um
            array <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">issues</code>{" "}
            com detalhes por campo.
          </p>
          <CodeBlock
            language="json"
            code={`{
  "code": "INVALID_API_KEY_SCOPES",
  "message": "Escopo inválido: \\"teachers:write\\"."
}`}
          />
          <CodeBlock
            language="json"
            code={`{
  "code": "VALIDATION_ERROR",
  "message": "Campos inválidos no corpo da requisição.",
  "issues": [
    { "path": ["name"], "message": "Dê um nome pra turma." },
    { "path": ["year"], "message": "Ano precisa ser entre 2020 e 2030." }
  ]
}`}
          />
          <Callout tone="tip">
            Use <code>code</code> (não <code>message</code>) pra tomar
            decisões no seu código. Mensagens podem ser melhoradas sem
            aviso — o code é contrato estável.
          </Callout>
        </section>

        {/* Tabela */}
        <section id="codigos" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Códigos HTTP</h2>
          <StatusCodeTable items={STATUS_CODES} />
        </section>

        {/* Retry */}
        <section id="retry" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Política de retry</h2>
          <ul className="ml-4 flex list-disc flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
            <li>
              <strong className="text-ink">2xx</strong>: sucesso, sem
              retry.
            </li>
            <li>
              <strong className="text-ink">4xx exceto 408, 409 e 429</strong>:
              não retente — corrija o input.
            </li>
            <li>
              <strong className="text-ink">408, 409</strong>: pode
              retentar após investigar (estado conflitante pode se
              resolver).
            </li>
            <li>
              <strong className="text-ink">429</strong>: respeite o{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
                Retry-After
              </code>
              .
            </li>
            <li>
              <strong className="text-ink">5xx</strong>: retry com
              backoff exponencial (ex.: 1s, 2s, 4s, 8s; máx 5 tentativas).
            </li>
          </ul>
        </section>

        <div className="flex justify-between gap-4 border-t border-gray-100 pt-8 text-[13px]">
          <Link
            href="/docs/autenticacao"
            className="text-gray-500 hover:text-ink"
          >
            ← Autenticação
          </Link>
          <Link
            href="/docs/api/turmas"
            className="text-gray-500 hover:text-ink"
          >
            Turmas →
          </Link>
        </div>
    </PageWithToc>
  );
}
