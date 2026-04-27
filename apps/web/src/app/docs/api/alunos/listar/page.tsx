import type { Metadata } from "next";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";

export const metadata: Metadata = { title: "Listar alunos · API" };

export default function ListarAlunosPage() {
  return (
    <EndpointPage
      method="GET"
      path="/v1/public/classes/:id/students"
      title="Listar alunos da turma"
      summary="Retorna todos os alunos cadastrados em uma turma da sua organização. Sem paginação por enquanto — turmas raramente passam de centenas de alunos."
      scope="students:read"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/classes/f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab/students \\
  -H "Authorization: Bearer lucida_live_sk_..."`,
        responseSuccess: {
          status: 200,
          description: "OK",
          body: `{
  "data": [
    {
      "id": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
      "name": "Maria Silva",
      "matricula": "2026-9A-014",
      "email": "maria.silva@escola.exemplo",
      "createdAt": "2026-04-24T13:15:02.000Z",
      "updatedAt": "2026-04-24T13:15:02.000Z"
    },
    {
      "id": "7b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
      "name": "João Santos",
      "matricula": "2026-9A-015",
      "email": null,
      "createdAt": "2026-04-24T13:15:03.000Z",
      "updatedAt": "2026-04-24T13:15:03.000Z"
    }
  ]
}`,
        },
        errorExamples: [
          {
            status: 404,
            code: "CLASS_NOT_FOUND",
            body: `{
  "code": "CLASS_NOT_FOUND",
  "message": "Turma não encontrada."
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Sincronizar a lista de alunos de uma turma com seu sistema, ou
        montar uma seleção de alunos pra gerar links de prova em lote.
      </EndpointSection>

      <EndpointSection title="Comportamento">
        <ul>
          <li>
            A turma precisa pertencer à mesma organização da chave. Senão
            a resposta é <code>404 CLASS_NOT_FOUND</code> — não revelamos
            existência de turmas cross-org.
          </li>
          <li>
            Ordenação fixa: <code>name asc</code>.
          </li>
          <li>
            <strong>Não pagina ainda.</strong> Se sua turma passa de
            algumas centenas de alunos e isso vira problema, abre uma
            sugestão no roadmap — paginação é um esforço pequeno.
          </li>
        </ul>
      </EndpointSection>

      <ParamSection
        title="Parâmetros de path"
        params={[
          {
            name: "id",
            type: "string",
            required: true,
            description: "Id da turma cujos alunos você quer listar.",
          },
        ]}
      />

      <ErrorListSection
        errors={[
          {
            status: 401,
            code: "UNAUTHORIZED",
            description:
              "Header Authorization ausente ou chave inválida/revogada.",
          },
          {
            status: 403,
            code: "INSUFFICIENT_SCOPE",
            description: (
              <>
                A chave não tem o escopo <code>students:read</code>.
              </>
            ),
          },
          {
            status: 404,
            code: "CLASS_NOT_FOUND",
            description:
              "Turma não existe ou não pertence à organização da chave.",
          },
        ]}
      />
    </EndpointPage>
  );
}
