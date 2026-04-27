import type { Metadata } from "next";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Listar turmas · API" };

export default function ListarTurmasPage() {
  return (
    <EndpointPage
      method="GET"
      path="/v1/public/classes"
      title="Listar turmas"
      summary="Pagina turmas da organização ordenadas por criação. Use pra montar uma lista no seu sistema interno ou sincronizar incrementalmente."
      scope="classes:read"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/classes?limit=20 \\
  -H "Authorization: Bearer lucida_live_sk_..."`,
        responseSuccess: {
          status: 200,
          description: "OK",
          body: `{
  "data": [
    {
      "id": "f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab",
      "name": "Matemática — 9º ano A",
      "description": null,
      "subject": "Matemática",
      "grade": "9",
      "teacherId": "65f9b2a1c8d4e7f3a9b5c2d1",
      "studentsCount": 28,
      "createdAt": "2026-02-12T14:23:10.000Z",
      "updatedAt": "2026-04-18T09:02:41.000Z"
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDE0OjIzOjEwLjAwMFoiLCJpZCI6ImY0YjJlMGM3In0",
    "hasMore": true
  }
}`,
        },
        errorExamples: [
          {
            status: 401,
            code: "UNAUTHORIZED",
            body: `{
  "code": "UNAUTHORIZED",
  "message": "Chave inválida ou revogada."
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Sincronização inicial (varrer todas as turmas pra popular um cache do
        seu lado) ou listagens paginadas no seu painel/SIS. Se você só
        precisa reagir a turmas novas em tempo real, use webhooks no futuro
        (em desenvolvimento) — evite polling.
      </EndpointSection>

      <EndpointSection
        title="Comportamento"
        hint="Detalhes de paginação, ordenação e consistência."
      >
        <ul>
          <li>
            Paginação por <strong>cursor opaco</strong> em{" "}
            <code>pageInfo.nextCursor</code>. Não inspecione nem construa o
            cursor manualmente — passe o valor do response anterior na
            próxima request.
          </li>
          <li>
            Ordenação fixa: <code>createdAt desc</code>, com tiebreak por
            <code>id</code> (estável mesmo quando duas turmas têm o mesmo
            timestamp).
          </li>
          <li>
            Resposta sempre traz <code>data</code> (array, possivelmente
            vazio) e <code>pageInfo</code> — nunca undefined.
          </li>
          <li>
            <code>description</code>, <code>subject</code> e{" "}
            <code>grade</code> podem vir <code>null</code> em turmas legadas
            que foram criadas pela UI antes desses campos existirem.
          </li>
        </ul>
      </EndpointSection>

      <ParamSection
        title="Parâmetros de query"
        params={[
          {
            name: "cursor",
            type: "string",
            description: (
              <>
                Token opaco retornado em <code>pageInfo.nextCursor</code> da
                página anterior. Omita na primeira página.
              </>
            ),
          },
          {
            name: "limit",
            type: "integer",
            defaultValue: "50",
            description: (
              <>
                Quantos itens por página. Range válido: <code>1</code> a{" "}
                <code>100</code>.
              </>
            ),
          },
          {
            name: "teacherId",
            type: "string",
            description: (
              <>
                Filtra apenas turmas cujo professor responsável é o user com
                esse id. Útil pra mostrar turmas de um docente específico no
                seu sistema.
              </>
            ),
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
                A chave não tem o escopo <code>classes:read</code>.
              </>
            ),
          },
          {
            status: 400,
            code: "INVALID_CURSOR",
            description:
              "Cursor recebido não é um valor opaco válido — provavelmente foi truncado, modificado ou corrompido em trânsito.",
          },
        ]}
      />

      <Callout tone="tip" title="Sincronização incremental">
        Pra refrescar só o que mudou desde a última sync, persista o último{" "}
        <code>updatedAt</code> que você viu e filtre client-side — ainda
        não temos filtro server-side por <code>updatedAt</code>.
      </Callout>
    </EndpointPage>
  );
}
