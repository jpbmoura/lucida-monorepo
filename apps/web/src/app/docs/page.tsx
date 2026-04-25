import Link from "next/link";
import {
  ArrowRight,
  Key,
  LifeBuoy,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { Callout } from "@/features/docs/components/callout";

export default function DocsHome() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="hero-aura-analytics flex flex-col gap-4 pb-2">
          <Eyebrow>Documentação</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.25rem]">
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
        </header>

        <Callout tone="warning" title="Rotas públicas em construção">
          O contrato descrito aqui reflete o que estará disponível em
          breve em <code>/v1/public/*</code>. Hoje você já pode criar
          chaves de API e cadastrar webhook endpoints pra adiantar o
          trabalho do seu time — os disparos reais e as rotas ficam
          ligados em iteração futura.
        </Callout>

        <section className="grid gap-4 md:grid-cols-2">
          <Card
            href="/docs/quickstart"
            icon={<Rocket className="size-5" />}
            eyebrow="Comece aqui"
            title="Quickstart"
            description="Da conta institucional à primeira chamada em 5 passos."
          />
          <Card
            href="/docs/autenticacao"
            icon={<Key className="size-5" />}
            eyebrow="Fundamentos"
            title="Autenticação"
            description="Como gerar chave, formato, live vs test e escopos."
          />
          <Card
            href="/docs/erros"
            icon={<TriangleAlert className="size-5" />}
            eyebrow="Fundamentos"
            title="Erros"
            description="Códigos HTTP, formato do body de erro e como tratar."
          />
          <Card
            href="/docs/api/turmas"
            icon={<ShieldCheck className="size-5" />}
            eyebrow="Referência"
            title="Turmas"
            description="Listar e criar turmas da instituição via API."
          />
          <Card
            href="/docs/webhooks"
            icon={<Webhook className="size-5" />}
            eyebrow="Eventos"
            title="Webhooks"
            description="Cadastre endpoints e receba eventos em tempo real."
          />
          <Card
            href="/analytics/desenvolvedores"
            icon={<LifeBuoy className="size-5" />}
            eyebrow="Ferramenta"
            title="Dashboard do dev"
            description="Gere chaves e gerencie webhooks. Exige login institucional."
            external
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Convenções
          </div>
          <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-gray-600">
            <li>
              <strong className="text-ink">Base URL:</strong>{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
                https://api.lucida.com.br
              </code>{" "}
              — todas as rotas públicas vivem sob{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
                /v1/public/*
              </code>
              .
            </li>
            <li>
              <strong className="text-ink">Versionamento:</strong> a versão
              maior fica no path (<code>v1</code>); adições compatíveis
              (novos campos opcionais, novos eventos) acontecem sem bump.
              Quebras de contrato entram em <code>v2</code>.
            </li>
            <li>
              <strong className="text-ink">Formato:</strong> JSON, UTF-8,
              sempre. Respostas de sucesso devolvem{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
                {"{ data }"}
              </code>
              ; erros devolvem{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
                {"{ code, message }"}
              </code>
              .
            </li>
            <li>
              <strong className="text-ink">Datas:</strong> ISO-8601 em UTC
              (<code>2026-04-24T14:30:00.000Z</code>).
            </li>
            <li>
              <strong className="text-ink">Identificadores:</strong>{" "}
              strings opacas — não assuma formato específico (podem ser
              UUID, ULID, ObjectId). Trate como <code>string</code> nos seus
              modelos.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function Card({
  href,
  icon,
  eyebrow,
  title,
  description,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-soft"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-analytics-primary/10 text-analytics-primary">
          {icon}
        </span>
        <ArrowRight className="size-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
          {eyebrow} {external && "·  ↗"}
        </div>
        <h3 className="text-base font-medium text-ink">{title}</h3>
        <p className="text-[13px] leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
    </Link>
  );
}
