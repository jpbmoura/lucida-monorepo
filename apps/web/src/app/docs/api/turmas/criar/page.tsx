import type { Metadata } from "next";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Criar turma · API" };

export default function CriarTurmaPage() {
  return (
    <EndpointPage
      method="POST"
      path="/v1/public/classes"
      title="Criar turma"
      summary="Cria uma nova turma vinculada a um professor da instituição. Retorna o objeto recém-criado pra você gravar o id no seu sistema."
      scope="classes:write"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/classes \\
  -X POST \\
  -H "Authorization: Bearer lucida_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Matemática — 9º ano A",
    "subject": "Matemática",
    "grade": "9",
    "teacherId": "65f9b2a1c8d4e7f3a9b5c2d1"
  }'`,
        responseSuccess: {
          status: 201,
          description: "Created",
          body: `{
  "data": {
    "id": "f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab",
    "name": "Matemática — 9º ano A",
    "description": null,
    "subject": "Matemática",
    "grade": "9",
    "teacherId": "65f9b2a1c8d4e7f3a9b5c2d1",
    "studentsCount": 0,
    "createdAt": "2026-04-24T13:07:52.000Z",
    "updatedAt": "2026-04-24T13:07:52.000Z"
  }
}`,
        },
        errorExamples: [
          {
            status: 422,
            code: "TEACHER_NOT_IN_ORG",
            body: `{
  "code": "TEACHER_NOT_IN_ORG",
  "message": "teacherId existe mas não é member da organização dessa chave de API."
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Provisionamento automático de turmas a partir do seu SIS quando uma
        nova matéria/turma é criada lá. Idealmente parte de um job síncrono
        ou de um webhook do seu lado — não chame em loop sem cuidar de
        rate limit.
      </EndpointSection>

      <EndpointSection title="Comportamento">
        <ul>
          <li>
            <strong>Não é idempotente.</strong> Chamar duas vezes cria duas
            turmas. Se quiser dedup, controle do lado do cliente (envie
            apenas após confirmar que ainda não existe no seu cache).
          </li>
          <li>
            <code>studentsCount</code> retorna <code>0</code> — alunos são
            cadastrados depois via{" "}
            <code>POST /v1/public/classes/:id/students</code>.
          </li>
          <li>
            O professor referenciado em <code>teacherId</code> precisa ser
            member da mesma organização da chave; senão recebe{" "}
            <code>422 TEACHER_NOT_IN_ORG</code>.
          </li>
          <li>
            <code>subject</code>, <code>grade</code> e{" "}
            <code>description</code> são opcionais — se não enviar, retornam{" "}
            <code>null</code> no objeto criado.
          </li>
        </ul>
      </EndpointSection>

      <ParamSection
        title="Corpo da requisição"
        hint="application/json"
        params={[
          {
            name: "name",
            type: "string",
            required: true,
            description:
              'Nome visível da turma (ex.: "Matemática — 9º ano A"). Entre 2 e 120 caracteres.',
          },
          {
            name: "teacherId",
            type: "string",
            required: true,
            description: (
              <>
                Id do professor responsável. Precisa ser member da mesma
                organização da chave, senão devolve{" "}
                <code>422 TEACHER_NOT_IN_ORG</code>.
              </>
            ),
          },
          {
            name: "subject",
            type: "string",
            description:
              'Disciplina principal (ex.: "Matemática", "Biologia"). Livre — não restrito a um enum. Máximo 80 caracteres.',
          },
          {
            name: "grade",
            type: "string",
            description:
              'Série/ano (ex.: "9", "3º EM"). Útil pra relatórios agregados por série. Máximo 30 caracteres.',
          },
          {
            name: "description",
            type: "string",
            description:
              "Texto livre pra contexto da turma. Máximo 200 caracteres.",
          },
        ]}
      />

      <ErrorListSection
        errors={[
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
            description: (
              <>
                A chave não tem o escopo <code>classes:write</code>.
              </>
            ),
          },
          {
            status: 422,
            code: "TEACHER_NOT_IN_ORG",
            description:
              "teacherId existe mas não é member da organização dessa chave.",
          },
        ]}
      />

      <Callout tone="warning" title="Sem rollback automático">
        Se sua sincronização falhar no meio (ex.: criou a turma mas o
        cadastro de alunos quebrou depois), a turma fica criada. Reaproveite
        o id retornado pra continuar de onde parou em vez de criar de novo.
      </Callout>
    </EndpointPage>
  );
}
