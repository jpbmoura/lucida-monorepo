import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { MethodBadge } from "@/features/docs/components/method-badge";
import { ScopeBadge } from "@/features/docs/components/scope-badge";

export const metadata: Metadata = { title: "Alunos · API" };

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
    method: "GET",
    path: "/v1/public/classes/:id/students",
    label: "Listar alunos da turma",
    description: "Retorna todos os alunos cadastrados em uma turma específica.",
    href: "/docs/api/alunos/listar",
    scope: "students:read",
  },
  {
    method: "POST",
    path: "/v1/public/classes/:id/students",
    label: "Cadastrar alunos em lote",
    description:
      "Cria vários alunos numa turma com sucesso parcial (207 Multi-Status).",
    href: "/docs/api/alunos/cadastrar",
    scope: "students:write",
  },
];

export default function AlunosOverviewPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
          <Eyebrow>Referência · Alunos</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            O recurso{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              Alunos
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Um <strong className="text-ink">aluno</strong> pertence a uma
            turma e carrega uma{" "}
            <strong className="text-ink">matrícula</strong> — o identificador
            externo do seu sistema (SIS, ERP). É a chave que conecta os
            dados da Lucida com o cadastro institucional do aluno no seu
            lado.
          </p>
        </header>

        {/* O objeto */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              O objeto Aluno
            </h2>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Formato canônico retornado em todos os endpoints desse recurso:
            </p>
          </div>
          <CodeBlock
            language="json"
            code={`{
  "id": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Maria Silva",
  "matricula": "2026-9A-014",
  "email": "maria.silva@escola.exemplo",
  "createdAt": "2026-04-24T13:15:02.000Z",
  "updatedAt": "2026-04-24T13:15:02.000Z"
}`}
          />
        </section>

        {/* Sobre matrícula */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Sobre a matrícula
            </h2>
            <p className="text-[14px] leading-relaxed text-gray-600">
              A matrícula é o identificador <strong>do seu lado</strong> —
              não da Lucida. Use o que faz sentido pro seu sistema: número
              do RA, código institucional, email corporativo. Ela é a chave
              que aparece nos webhooks de nota e no link de prova
              pré-preenchido.
            </p>
          </div>
          <Callout tone="info" title="Escopo da unicidade">
            A matrícula pode ser única <strong>por professor</strong>{" "}
            (default — bom pra marketplaces e contas individuais) ou{" "}
            <strong>por organização</strong> (escolas/universidades que têm
            RA único institucional). O modo é configurável em{" "}
            <code>PUT /v1/analytics/organization/preferences</code>.
          </Callout>
        </section>

        {/* Endpoints */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              Endpoints
            </h2>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Cada rota tem sua própria página com parâmetros, exemplos e
              erros. Atualização e remoção chegam em iteração futura.
            </p>
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
