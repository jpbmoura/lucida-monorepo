import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { MethodBadge } from "@/features/docs/components/method-badge";
import { ScopeBadge } from "@/features/docs/components/scope-badge";

export const metadata: Metadata = { title: "Notas · API" };

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
    path: "/v1/public/exams/:id/results",
    label: "Listar notas da prova",
    description:
      "Retorna todos os alunos da turma da prova com status pending ou completed.",
    href: "/docs/api/notas/listar",
    scope: "exams:read",
  },
];

export default function NotasOverviewPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
          <Eyebrow>Referência · Notas</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            O recurso{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              Notas
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Notas são derivadas — você não cria nem edita uma nota. Elas
            aparecem quando um aluno entrega uma prova. A API expõe a{" "}
            <strong className="text-ink">listagem por prova</strong> com
            todos os alunos da turma, marcando quem já entregou e a nota
            obtida.
          </p>
        </header>

        {/* O objeto */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
              O objeto Resultado
            </h2>
            <p className="text-[14px] leading-relaxed text-gray-600">
              Cada item da listagem é um resultado por aluno. Pra alunos
              que ainda não fizeram, vem só a identificação:
            </p>
          </div>
          <CodeBlock
            language="json"
            code={`{
  "status": "pending",
  "studentId": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "João Santos",
  "matricula": "2026-9A-015"
}`}
          />
          <p className="text-[14px] leading-relaxed text-gray-600">
            Pra quem entregou, vem o resultado completo:
          </p>
          <CodeBlock
            language="json"
            code={`{
  "status": "completed",
  "studentId": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Maria Silva",
  "matricula": "2026-9A-014",
  "submissionId": "sub_01HZXPQ2J4V8M6N5T1R3G7K9L0",
  "score": 8.4,
  "maxScore": 10,
  "correctCount": 21,
  "questionCount": 25,
  "submittedAt": "2026-04-24T14:05:47.000Z",
  "endReason": "submitted"
}`}
          />
        </section>

        {/* Polling vs webhook */}
        <Callout tone="tip" title="Prefira webhook em vez de polling">
          Pra reagir a uma entrega assim que ela acontece, escute o
          webhook{" "}
          <Link
            href="/docs/webhooks/submission-completed"
            className="text-analytics-primary underline underline-offset-2"
          >
            <code>submission.completed</code>
          </Link>
          . O endpoint REST aqui é melhor pra dashboards e relatórios
          agregados onde você precisa do estado da turma inteira de uma vez.
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
