import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { EndpointCard } from "@/features/docs/components/endpoint-card";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Turmas · API" };

export default function TurmasApiPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="hero-aura-analytics flex flex-col gap-4 border-b border-gray-100 pb-8">
          <Eyebrow>Referência</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-[2.75rem]">
            Turmas
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Uma <strong className="text-ink">turma</strong> agrupa alunos
            sob um professor da instituição. Ela é o container pra provas
            e submissões — você normalmente lista turmas primeiro, depois
            navega pros alunos e provas dentro de cada uma.
          </p>
        </header>

        {/* Objeto */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-medium text-ink">O objeto Turma</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Formato canônico retornado nos endpoints desta seção:
          </p>
          <CodeBlock
            language="json"
            code={`{
  "id": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
  "name": "Matemática — 9º ano A",
  "subject": "Matemática",
  "grade": "9",
  "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
  "studentsCount": 28,
  "createdAt": "2026-02-12T14:23:10.000Z",
  "updatedAt": "2026-04-18T09:02:41.000Z"
}`}
          />
          <Callout tone="info">
            <code>studentsCount</code> é derivado — atualiza sozinho
            quando alunos são adicionados/removidos via <code>POST /v1/public/students</code>. Não tente gravar esse campo.
          </Callout>
        </section>

        {/* Endpoints */}
        <section className="flex flex-col gap-8" id="endpoints">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-medium text-ink">Endpoints</h2>
            <p className="text-[13px] text-gray-500">
              Dois endpoints nesta fase da documentação — listar e
              criar. Atualização e remoção chegam em breve.
            </p>
          </div>

          {/* GET list */}
          <EndpointCard
            anchor="classes-list"
            method="GET"
            path="/v1/public/classes"
            scope="classes:read"
            description={
              <>
                Lista turmas da organização, paginado por cursor. Cada
                página traz até <code>limit</code> itens (padrão 50,
                máximo 100). Ordenação padrão é{" "}
                <code>createdAt</code> desc — turma mais recente primeiro.
              </>
            }
            queryParams={[
              {
                name: "cursor",
                type: "string",
                description: (
                  <>
                    Token opaco retornado em <code>pageInfo.nextCursor</code>{" "}
                    da página anterior. Omita na primeira página.
                  </>
                ),
              },
              {
                name: "limit",
                type: "integer",
                defaultValue: "50",
                description: (
                  <>
                    Quantos items por página. Range válido:{" "}
                    <code>1</code> a <code>100</code>.
                  </>
                ),
              },
              {
                name: "teacherId",
                type: "string",
                description: (
                  <>
                    Filtra apenas turmas cujo professor responsável é o
                    user com esse id. Útil pra mostrar turmas de um
                    docente específico no seu sistema.
                  </>
                ),
              },
            ]}
            request={`curl https://api.lucida.com.br/v1/public/classes?limit=20 \\
  -H "Authorization: Bearer lucida_live_sk_..."`}
            responseSuccess={{
              status: 200,
              description: "OK",
              body: `{
  "data": [
    {
      "id": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
      "name": "Matemática — 9º ano A",
      "subject": "Matemática",
      "grade": "9",
      "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
      "studentsCount": 28,
      "createdAt": "2026-02-12T14:23:10.000Z",
      "updatedAt": "2026-04-18T09:02:41.000Z"
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA0LTE4VDA5..." ,
    "hasMore": true
  }
}`,
            }}
            responseErrors={[
              {
                status: 401,
                code: "UNAUTHORIZED",
                description:
                  "Header Authorization ausente ou chave inválida/revogada.",
              },
              {
                status: 403,
                code: "INSUFFICIENT_SCOPE",
                description:
                  "A chave não tem o escopo classes:read.",
              },
              {
                status: 429,
                code: "RATE_LIMITED",
                description:
                  "Limite por chave estourado. Respeite o header Retry-After.",
              },
            ]}
          />

          {/* POST create */}
          <EndpointCard
            anchor="classes-create"
            method="POST"
            path="/v1/public/classes"
            scope="classes:write"
            description={
              <>
                Cria uma nova turma vinculada a um professor da
                instituição. Retorna o objeto recém-criado —{" "}
                <code>studentsCount</code> começa em 0 e cresce conforme
                alunos são adicionados.
              </>
            }
            bodyParams={[
              {
                name: "name",
                type: "string",
                required: true,
                description:
                  "Nome visível da turma (ex.: \"Matemática — 9º ano A\"). Entre 1 e 120 caracteres.",
              },
              {
                name: "subject",
                type: "string",
                required: true,
                description:
                  "Disciplina principal (ex.: \"Matemática\", \"Biologia\"). Livre — não restrito a um enum.",
              },
              {
                name: "grade",
                type: "string",
                description:
                  "Série/ano (ex.: \"9\", \"3º EM\"). Opcional; útil pra relatórios agregados por série.",
              },
              {
                name: "teacherId",
                type: "string",
                required: true,
                description: (
                  <>
                    Id do professor responsável. O professor precisa ser
                    member da mesma organização da chave, caso contrário
                    a resposta é <code>422 UNPROCESSABLE_ENTITY</code>.
                  </>
                ),
              },
            ]}
            request={`curl https://api.lucida.com.br/v1/public/classes \\
  -X POST \\
  -H "Authorization: Bearer lucida_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Matemática — 9º ano A",
    "subject": "Matemática",
    "grade": "9",
    "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X"
  }'`}
            responseSuccess={{
              status: 201,
              description: "Created",
              body: `{
  "data": {
    "id": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
    "name": "Matemática — 9º ano A",
    "subject": "Matemática",
    "grade": "9",
    "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
    "studentsCount": 0,
    "createdAt": "2026-04-24T13:07:52.000Z",
    "updatedAt": "2026-04-24T13:07:52.000Z"
  }
}`,
            }}
            responseErrors={[
              {
                status: 400,
                code: "VALIDATION_ERROR",
                description:
                  "Campo ausente ou com tipo inválido. issues descreve os campos.",
              },
              {
                status: 401,
                code: "UNAUTHORIZED",
                description:
                  "Header Authorization ausente ou chave inválida/revogada.",
              },
              {
                status: 403,
                code: "INSUFFICIENT_SCOPE",
                description:
                  "A chave não tem o escopo classes:write.",
              },
              {
                status: 422,
                code: "TEACHER_NOT_IN_ORG",
                description:
                  "teacherId existe mas não é member da organização dessa chave.",
              },
            ]}
          />
        </section>

        <Callout tone="info" title="Em construção">
          Nessa fase da doc, só turmas entram. Os endpoints de alunos,
          provas e submissões vão seguir o mesmo padrão e estarão aqui
          quando lançarmos — os escopos correspondentes já existem no
          dashboard.
        </Callout>

        <div className="flex justify-between gap-4 border-t border-gray-100 pt-8 text-[13px]">
          <Link
            href="/docs/erros"
            className="text-gray-500 hover:text-ink"
          >
            ← Erros
          </Link>
          <Link
            href="/docs/webhooks"
            className="text-gray-500 hover:text-ink"
          >
            Webhooks →
          </Link>
        </div>
      </div>
    </main>
  );
}
