import type { Metadata } from "next";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Cadastrar alunos · API" };

export default function CadastrarAlunosPage() {
  return (
    <EndpointPage
      method="POST"
      path="/v1/public/classes/:id/students"
      title="Cadastrar alunos em lote"
      summary="Cria vários alunos numa turma com sucesso parcial — cada item devolve seu próprio status (created / duplicate / error). Pensado pra integração com SIS."
      scope="students:write"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/classes/f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab/students \\
  -X POST \\
  -H "Authorization: Bearer lucida_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "students": [
      {
        "name": "Maria Silva",
        "matricula": "2026-9A-014",
        "email": "maria.silva@escola.exemplo"
      },
      {
        "name": "João Santos",
        "matricula": "2026-9A-015"
      },
      {
        "name": "Ana Pereira",
        "matricula": "2026-9A-014"
      }
    ]
  }'`,
        responseSuccess: {
          status: 207,
          description: "Multi-Status",
          body: `{
  "results": [
    {
      "status": "created",
      "matricula": "2026-9A-014",
      "studentId": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
      "code": "0473281"
    },
    {
      "status": "created",
      "matricula": "2026-9A-015",
      "studentId": "7b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
      "code": "1928374"
    },
    {
      "status": "duplicate",
      "matricula": "2026-9A-014",
      "existingStudentId": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c"
    }
  ],
  "summary": {
    "created": 2,
    "duplicate": 1,
    "error": 0
  }
}`,
        },
        errorExamples: [
          {
            status: 207,
            code: "ITEM_ERROR",
            body: `{
  "results": [
    {
      "status": "error",
      "matricula": "abc",
      "error": {
        "code": "STUDENT_NAME_INVALID",
        "message": "Nome precisa ter ao menos 2 caracteres."
      }
    }
  ],
  "summary": { "created": 0, "duplicate": 0, "error": 1 }
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Onboarding inicial de uma turma a partir do seu SIS, ou
        sincronização recorrente de matrículas. O batch tolera duplicatas
        — você pode rodar a mesma sincronização várias vezes sem medo de
        criar alunos repetidos.
      </EndpointSection>

      <EndpointSection title="Comportamento por item">
        <ul>
          <li>
            <strong>created:</strong> aluno novo. Retorna o{" "}
            <code>studentId</code> gerado pela Lucida e o{" "}
            <code>code</code> de 7 dígitos usado nas folhas físicas (OMR)
            — guarde os dois.
          </li>
          <li>
            <strong>duplicate:</strong> matrícula já existe no escopo
            configurado. Retorna o <code>existingStudentId</code> pra
            você reusar no seu side. <strong>Não atualiza dados</strong> —
            atualizações vão por endpoint dedicado (em desenvolvimento).
          </li>
          <li>
            <strong>error:</strong> validação falhou no item. O resto do
            batch continua processando. <code>error.code</code> é estável
            pra reaction programática.
          </li>
        </ul>
      </EndpointSection>

      <EndpointSection title="Escopo da matrícula">
        Define onde a Lucida procura duplicatas. Configure em{" "}
        <code>PUT /v1/analytics/organization/preferences</code>:
        <ul>
          <li>
            <code>"teacher"</code> (default): matrícula única por
            professor. Duas turmas de professores diferentes podem ter
            alunos com a mesma matrícula sem conflito.
          </li>
          <li>
            <code>"organization"</code>: matrícula única na organização
            inteira. Bom pra escolas/universidades onde a matrícula é o
            RA institucional do aluno.
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
            description: "Id da turma onde os alunos serão cadastrados.",
          },
        ]}
      />

      <ParamSection
        title="Corpo da requisição"
        hint="application/json"
        params={[
          {
            name: "students",
            type: "object[]",
            required: true,
            description: (
              <>
                Array de até <code>500</code> alunos. Veja shape de cada
                item abaixo.
              </>
            ),
          },
          {
            name: "students[].name",
            type: "string",
            required: true,
            description: "Nome do aluno. Entre 2 e 120 caracteres.",
          },
          {
            name: "students[].matricula",
            type: "string",
            required: true,
            description:
              "Identificador externo do aluno no seu sistema. Entre 1 e 40 caracteres.",
          },
          {
            name: "students[].email",
            type: "string",
            description:
              "E-mail do aluno (opcional). Útil pra notificações futuras.",
          },
        ]}
      />

      <ErrorListSection
        errors={[
          {
            status: 207,
            code: "Multi-Status",
            description: (
              <>
                Resposta normal — sempre <code>207</code>, mesmo quando
                todos foram <code>created</code>. Inspecione{" "}
                <code>results[].status</code> e <code>summary</code>.
              </>
            ),
          },
          {
            status: 400,
            code: "VALIDATION_ERROR",
            description:
              "Estrutura do batch inválida (ex.: array vazio, item sem name). Erro de validação de domínio por item vai dentro do response 207, não aqui.",
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
            description: (
              <>
                A chave não tem o escopo <code>students:write</code>.
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

      <Callout tone="tip" title="Dedup intra-batch">
        Se você mandar duas vezes a mesma matrícula no mesmo POST, a
        primeira ocorrência vira <code>created</code> e as seguintes viram{" "}
        <code>duplicate</code> apontando pro <code>studentId</code>{" "}
        recém-criado. Útil quando seu SIS exporta CSVs com linhas
        repetidas.
      </Callout>
    </EndpointPage>
  );
}
