import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Key,
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { Button } from "@/components/ui/button";
import { Callout } from "@/features/docs/components/callout";
import { CodeBlock } from "@/features/docs/components/code-block";

export default function DocsHome() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        {/* Hero */}
        <header className="flex flex-col gap-6">
          <Eyebrow>Documentação</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.25rem]">
            Integre sua{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              instituição
            </span>{" "}
            com a Lucida
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Guias e referência da API pública da Lucida. Feito pra equipes
            técnicas de instituições integrarem seus sistemas internos
            (SIS, CRM, data warehouse) com turmas, alunos, provas e
            resultados do Lucida Exam.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="primary" size="md">
              <Link href="/docs/quickstart">
                Começar com o Quickstart
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href="/docs/api/turmas">Ver referência da API</Link>
            </Button>
          </div>
        </header>

        <Callout tone="warning" title="Rotas públicas em construção">
          O contrato descrito aqui reflete o que estará disponível em
          breve em <code>/v1/public/*</code>. Hoje você já pode criar
          chaves de API e cadastrar webhook endpoints pra adiantar o
          trabalho do seu time — os disparos reais e as rotas ficam
          ligados em iteração futura.
        </Callout>

        {/* Comece aqui — card hero diferenciado */}
        <Track label="Comece aqui">
          <Link
            href="/docs/quickstart"
            className="group relative grid gap-8 overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-soft md:grid-cols-[1fr_minmax(0,1.1fr)] md:p-9"
          >
            <div className="flex flex-col gap-4">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
                <Rocket className="size-5" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-medium tracking-tight text-ink">
                  Quickstart em 5 minutos
                </h3>
                <p className="text-[14px] leading-relaxed text-gray-500">
                  Da conta institucional à primeira chamada bem-sucedida.
                  Quatro passos curtos e um exemplo pronto pra copiar.
                </p>
              </div>
              <div className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-analytics-primary">
                Começar agora
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
            <div className="hidden md:block">
              <CodeBlock
                language="curl"
                code={`curl https://api.lucida.com.br/v1/public/classes \\
  -H "Authorization: Bearer SEU_TOKEN"`}
              />
            </div>
          </Link>
        </Track>

        {/* Fundamentos */}
        <Track label="Fundamentos">
          <div className="grid gap-3 md:grid-cols-2">
            <ResourceCard
              href="/docs/autenticacao"
              icon={<Key className="size-4" />}
              title="Autenticação"
              description="Como gerar chave, formato, live vs test e escopos."
            />
            <ResourceCard
              href="/docs/erros"
              icon={<TriangleAlert className="size-4" />}
              title="Erros"
              description="Códigos HTTP, formato do body de erro e como tratar."
            />
          </div>
        </Track>

        {/* Referência */}
        <Track label="Referência">
          <div className="grid gap-3 md:grid-cols-2">
            <ResourceCard
              href="/docs/api/turmas"
              icon={<ShieldCheck className="size-4" />}
              title="Turmas"
              description="Listar e criar turmas da instituição via API."
            />
            <ResourceCard
              href="/docs/webhooks"
              icon={<Webhook className="size-4" />}
              title="Webhooks"
              description="Cadastre endpoints e receba eventos em tempo real."
            />
          </div>
        </Track>

        {/* Ferramentas */}
        <Track label="Ferramentas">
          <ResourceCard
            href="/analytics/desenvolvedores"
            icon={<LayoutDashboard className="size-4" />}
            title="Dashboard do dev"
            description="Gere chaves de API e gerencie webhooks. Exige login institucional."
            external
          />
        </Track>

        {/* API at a glance */}
        <ApiAtAGlance />
      </div>
    </main>
  );
}

/**
 * Track — agrupa um conjunto de cards sob um label uppercase, como na
 * sidebar. Mantém hierarquia visual entre "Comece aqui", "Fundamentos",
 * "Referência" e "Ferramentas".
 */
function Track({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
        {label}
      </h2>
      {children}
    </section>
  );
}

/**
 * Card padrão de recurso. Usado em Fundamentos / Referência / Ferramentas.
 * `external` adiciona ícone de link externo no canto.
 */
function ResourceCard({
  href,
  icon,
  title,
  description,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-soft"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-700 transition-colors group-hover:bg-analytics-primary/10 group-hover:text-analytics-primary">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
          {title}
          {external && (
            <ArrowUpRight className="size-3.5 text-gray-400" aria-hidden />
          )}
        </h3>
        <p className="text-[13px] leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
      {!external && (
        <ArrowRight className="size-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink" />
      )}
    </Link>
  );
}

interface Convention {
  label: string;
  value: string;
  hint?: string;
}

const CONVENTIONS: Convention[] = [
  {
    label: "Base URL",
    value: "https://api.lucida.com.br",
    hint: "Sob /v1/public/*",
  },
  {
    label: "Versão",
    value: "v1",
    hint: "Adições compatíveis sem bump",
  },
  {
    label: "Formato",
    value: "JSON · UTF-8",
    hint: "Sucesso { data } · erro { code, message }",
  },
  {
    label: "Datas",
    value: "ISO-8601 · UTC",
    hint: "2026-04-24T14:30:00.000Z",
  },
  {
    label: "Identificadores",
    value: "string opaca",
    hint: "Não assuma UUID/ULID/ObjectId",
  },
  {
    label: "Auth",
    value: "Bearer token",
    hint: "Header Authorization",
  },
];

function ApiAtAGlance() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/40 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
          API at a glance
        </h2>
        <p className="text-[13px] text-gray-500">
          As convenções que valem pra todas as rotas e payloads.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONVENTIONS.map((c) => (
          <li
            key={c.label}
            className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white px-4 py-3"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
              {c.label}
            </span>
            <code className="font-mono text-[13px] font-medium text-ink">
              {c.value}
            </code>
            {c.hint && (
              <span className="text-[11.5px] leading-snug text-gray-500">
                {c.hint}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
