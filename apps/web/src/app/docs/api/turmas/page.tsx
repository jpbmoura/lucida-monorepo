import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { MethodBadge } from "@/features/docs/components/method-badge";
import { ScopeBadge } from "@/features/docs/components/scope-badge";

export const metadata: Metadata = { title: "Turmas · API" };

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
    path: "/v1/public/classes",
    label: "Listar turmas",
    description: "Pagina turmas da organização ordenadas por criação.",
    href: "/docs/api/turmas/listar",
    scope: "classes:read",
  },
  {
    method: "POST",
    path: "/v1/public/classes",
    label: "Criar turma",
    description: "Cria uma nova turma vinculada a um professor.",
    href: "/docs/api/turmas/criar",
    scope: "classes:write",
  },
];

export default function TurmasOverviewPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
          <Eyebrow>Referência · Turmas</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            O recurso{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              Turmas
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Uma <strong className="text-ink">turma</strong> agrupa alunos sob
            um professor da instituição. Funciona como container pra provas e
            submissões — você normalmente lista turmas primeiro, depois navega
            pros alunos e provas dentro de cada uma.
          </p>
        </header>

        {/* O objeto */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              O objeto Turma
            </h2>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Formato canônico retornado em todos os endpoints desse recurso:
            </p>
          </div>
          <CodeBlock
            language="json"
            code={`{
  "id": "f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab",
  "name": "Matemática — 9º ano A",
  "description": null,
  "subject": "Matemática",
  "grade": "9",
  "teacherId": "65f9b2a1c8d4e7f3a9b5c2d1",
  "studentsCount": 28,
  "createdAt": "2026-02-12T14:23:10.000Z",
  "updatedAt": "2026-04-18T09:02:41.000Z"
}`}
          />
          <Callout tone="info">
            <code>studentsCount</code> é derivado — atualiza sozinho quando
            alunos são cadastrados via{" "}
            <code>POST /v1/public/classes/:id/students</code>. Não tente
            gravar esse campo manualmente.
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
              erros. Edição e remoção chegam em iteração futura.
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

        <Callout tone="info" title="Em construção">
          Nessa fase da doc só turmas entram. Endpoints de alunos, provas e
          submissões vão seguir o mesmo padrão e estarão aqui quando lançarmos
          — os escopos correspondentes já existem no dashboard.
        </Callout>
      </div>
    </main>
  );
}
