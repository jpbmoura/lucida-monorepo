import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Quickstart" };

export default function QuickstartPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="hero-aura-analytics flex flex-col gap-4 border-b border-gray-100 pb-8">
          <Eyebrow>Quickstart</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-[2.75rem]">
            Da conta à primeira{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              chamada
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Cinco passos pra sair do zero e ter uma resposta com dados
            reais da sua instituição. Tempo esperado: 5 minutos.
          </p>
        </header>

        <Step
          number={1}
          title="Crie uma conta institucional"
          description={
            <p>
              Se sua instituição ainda não tem conta na Lucida, comece
              por{" "}
              <Link
                href="/organizacoes/entrar"
                className="text-analytics-primary underline underline-offset-2 hover:text-analytics-dark-01"
              >
                Organizações · Entrar
              </Link>
              . Você precisa ser o <strong className="text-ink">owner</strong>{" "}
              ou <strong className="text-ink">admin</strong> da organização
              pra conseguir gerar chaves.
            </p>
          }
        />

        <Step
          number={2}
          title="Gere uma chave de API"
          description={
            <>
              <p className="mb-3">
                No painel institucional, vá em{" "}
                <Link
                  href="/analytics/desenvolvedores"
                  className="text-analytics-primary underline underline-offset-2 hover:text-analytics-dark-01"
                >
                  Analytics → Desenvolvedores
                </Link>{" "}
                e clique em <strong className="text-ink">Nova chave</strong>.
                Escolha:
              </p>
              <ul className="ml-4 flex list-disc flex-col gap-1.5 text-[13px]">
                <li>
                  <strong className="text-ink">Nome</strong>: identifica
                  onde a chave é usada (ex.: "SIS Totvs", "CRM HubSpot").
                </li>
                <li>
                  <strong className="text-ink">Ambiente</strong>:{" "}
                  <code>test</code> pra explorar sem consumir créditos;{" "}
                  <code>live</code> pra produção.
                </li>
                <li>
                  <strong className="text-ink">Escopos</strong>: marque só
                  o necessário (princípio do menor privilégio).
                </li>
              </ul>
              <Callout tone="warning" className="mt-4">
                A chave é exibida <strong>uma única vez</strong> logo após
                a criação. Copie e guarde em um vault ou variável de
                ambiente — nunca commit em repositório.
              </Callout>
            </>
          }
        />

        <Step
          number={3}
          title="Faça a primeira chamada"
          description={
            <>
              <p className="mb-3">
                Substitua{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
                  SEU_TOKEN
                </code>{" "}
                pela chave que você acabou de gerar:
              </p>
              <CodeBlock
                language="curl"
                code={`curl https://api.lucida.com.br/v1/public/classes \\
  -H "Authorization: Bearer SEU_TOKEN"`}
              />
            </>
          }
        />

        <Step
          number={4}
          title="Confira a resposta"
          description={
            <>
              <p className="mb-3">
                Em sucesso, a API devolve <code>200 OK</code> com um
                array de turmas dentro de <code>data</code>:
              </p>
              <CodeBlock
                language="json"
                code={`{
  "data": [
    {
      "id": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
      "name": "Matemática — 9º ano A",
      "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
      "studentsCount": 28,
      "createdAt": "2026-02-12T14:23:10.000Z"
    }
  ],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}`}
              />
              <p className="mt-4 text-[13px] text-gray-500">
                Se receber <code>401</code>, revise o header{" "}
                <code>Authorization</code>. Se <code>403</code>, a chave
                não tem o escopo <code>classes:read</code>.
              </p>
            </>
          }
        />

        <Step
          number={5}
          title="Próximos passos"
          description={
            <div className="grid gap-3 md:grid-cols-2">
              <NextCard
                href="/docs/autenticacao"
                title="Autenticação"
                description="Formatos, live vs test, escopos e boas práticas."
              />
              <NextCard
                href="/docs/api/turmas"
                title="Referência — Turmas"
                description="Todos os parâmetros, tipos e respostas."
              />
              <NextCard
                href="/docs/webhooks"
                title="Webhooks"
                description="Receba eventos em tempo real — não faça polling."
              />
              <NextCard
                href="/docs/erros"
                title="Erros"
                description="Lista de códigos e como tratar cada um."
              />
            </div>
          }
        />
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <section className="flex gap-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-analytics-primary/10 font-mono text-[13px] font-semibold text-analytics-primary">
        {number}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-xl font-medium text-ink">{title}</h2>
        <div className="text-[14px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
          {description}
        </div>
      </div>
    </section>
  );
}

function NextCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200 hover:bg-gray-50/40"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-ink">{title}</h3>
        <ArrowRight className="size-3.5 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <p className="text-[12.5px] text-gray-500">{description}</p>
    </Link>
  );
}
