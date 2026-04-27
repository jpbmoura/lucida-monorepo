import type { Metadata } from "next";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Gerar link da prova · API" };

export default function GerarLinkPage() {
  return (
    <EndpointPage
      method="POST"
      path="/v1/public/exams/:id/share-link"
      title="Gerar link da prova"
      summary="Cria link assinado pra um aluno entrar direto na prova, sem precisar do código de 7 dígitos. A matrícula resolve o aluno; o token bloqueia identidade."
      scope="exams:share"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/exams/exm_01HZX9WMR7D2Q8J4F3P5V6N2B1/share-link \\
  -X POST \\
  -H "Authorization: Bearer lucida_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "matricula": "2026-9A-014"
  }'`,
        responseSuccess: {
          status: 201,
          description: "Created",
          body: `{
  "data": {
    "url": "https://app.lucidaexam.com/exam/abc123/start/eyJleGFtSWQiOi...",
    "token": "eyJleGFtSWQiOi...",
    "student": {
      "id": "8a1f2c3d-4b5e-6f7a-8b9c-0d1e2f3a4b5c",
      "name": "Maria Silva",
      "matricula": "2026-9A-014"
    },
    "exam": {
      "id": "exm_01HZX9WMR7D2Q8J4F3P5V6N2B1",
      "title": "Prova bimestral — Funções",
      "shareId": "abc123"
    }
  }
}`,
        },
        errorExamples: [
          {
            status: 404,
            code: "MATRICULA_NOT_FOUND",
            body: `{
  "code": "MATRICULA_NOT_FOUND",
  "message": "Nenhum aluno encontrado com essa matrícula no escopo configurado da organização."
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Substitui o passo "digite seu código" por um clique direto. Útil
        em comunicações automatizadas — email/SMS pros pais com link da
        prova do filho, integração com LMS que abre prova embedada,
        provas individuais que precisam de identidade garantida.
      </EndpointSection>

      <EndpointSection title="Como o de-para de matrícula funciona">
        <ul>
          <li>
            A matrícula que você envia é o identificador externo que sua
            instituição cadastrou via{" "}
            <code>POST /v1/public/classes/:id/students</code>.
          </li>
          <li>
            A Lucida resolve <strong>matrícula → studentId</strong>{" "}
            internamente respeitando o{" "}
            <code>matriculaScope</code> da org (teacher | organization).
          </li>
          <li>
            Se a matrícula bater com um aluno, mas ele estiver em outra
            turma diferente da prova, devolve <code>422 STUDENT_NOT_IN_CLASS</code>.
          </li>
        </ul>
      </EndpointSection>

      <EndpointSection title="O token no link">
        <ul>
          <li>
            Formato compacto:{" "}
            <code>base64url(payload).base64url(hmac)</code>. Não é JWT —
            simples HMAC-SHA256 com o secret da Lucida.
          </li>
          <li>
            Payload: <code>{"{ examId, studentId, iat }"}</code>. Visível
            (não criptografado), mas qualquer modificação invalida a
            assinatura.
          </li>
          <li>
            <strong>Sem expiração.</strong> O link vale enquanto a prova
            existir e o aluno não tiver entregue. Se quiser revogar
            antes, é necessário deletar o aluno (ainda não exposto via
            API).
          </li>
          <li>
            <strong>Reusável.</strong> O aluno pode fechar o navegador e
            abrir o mesmo link de novo — retoma de onde parou.
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
            description: "Id da prova pra qual o link será gerado.",
          },
        ]}
      />

      <ParamSection
        title="Corpo da requisição"
        hint="application/json"
        params={[
          {
            name: "matricula",
            type: "string",
            required: true,
            description:
              "Identificador externo do aluno (a mesma string usada em POST /v1/public/classes/:id/students).",
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
                A chave não tem o escopo <code>exams:share</code>.
              </>
            ),
          },
          {
            status: 404,
            code: "EXAM_NOT_FOUND",
            description:
              "Prova não existe ou não pertence à organização da chave.",
          },
          {
            status: 404,
            code: "MATRICULA_NOT_FOUND",
            description:
              "Nenhum aluno encontrado com essa matrícula no escopo configurado.",
          },
          {
            status: 422,
            code: "STUDENT_NOT_IN_CLASS",
            description:
              "Matrícula encontrada, mas o aluno está em outra turma diferente da prova.",
          },
        ]}
      />

      <Callout tone="warning" title="Trate o link como dado sensível">
        Quem tem o link pode responder a prova como o aluno. Envie por
        canais confiáveis (email/SMS institucionais) e evite logar a URL
        completa em sistemas de monitoramento.
      </Callout>
    </EndpointPage>
  );
}
