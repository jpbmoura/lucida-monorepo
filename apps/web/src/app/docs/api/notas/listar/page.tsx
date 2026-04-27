import type { Metadata } from "next";
import Link from "next/link";
import { EndpointPage } from "@/features/docs/components/endpoint-page";
import {
  EndpointSection,
  ErrorListSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = { title: "Listar notas · API" };

export default function ListarNotasPage() {
  return (
    <EndpointPage
      method="GET"
      path="/v1/public/exams/:id/results"
      title="Listar notas da prova"
      summary="Retorna TODOS os alunos da turma da prova com status pending ou completed. Inclui resumo agregado (total, completados, pendentes, média) pra dashboards."
      scope="exams:read"
      sidekick={{
        request: `curl https://api.lucida.com.br/v1/public/exams/exm_01HZX9WMR7D2Q8J4F3P5V6N2B1/results \\
  -H "Authorization: Bearer lucida_live_sk_..."`,
        responseSuccess: {
          status: 200,
          description: "OK",
          body: `{
  "exam": {
    "id": "exm_01HZX9WMR7D2Q8J4F3P5V6N2B1",
    "title": "Prova bimestral — Funções",
    "classId": "f4b2e0c7-1d8a-4d6b-9e7f-1234567890ab",
    "questionCount": 25,
    "maxScore": 10
  },
  "data": [
    {
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
    },
    {
      "status": "pending",
      "studentId": "7b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
      "name": "João Santos",
      "matricula": "2026-9A-015"
    }
  ],
  "summary": {
    "total": 2,
    "completed": 1,
    "pending": 1,
    "averageScore": 8.4
  }
}`,
        },
        errorExamples: [
          {
            status: 404,
            code: "EXAM_NOT_FOUND",
            body: `{
  "code": "EXAM_NOT_FOUND",
  "message": "Prova não encontrada."
}`,
          },
        ],
      }}
    >
      <EndpointSection title="Quando usar">
        Dashboard de acompanhamento da turma, relatório consolidado pra
        coordenação, ou snapshot inicial pra quem prefere puxar tudo de
        vez em vez de manter sync incremental por webhook.
      </EndpointSection>

      <EndpointSection title="Comportamento">
        <ul>
          <li>
            <strong>Inclui todos os alunos da turma</strong>, mesmo os que
            ainda não fizeram. Pra cada um, <code>status</code> determina
            quais campos vêm: <code>pending</code> traz só identificação;{" "}
            <code>completed</code> traz tudo.
          </li>
          <li>
            Submissões em progresso (<code>in_progress</code>) contam como{" "}
            <code>pending</code> — só aparece como completed depois que o
            aluno entrega ou o tempo estoura.
          </li>
          <li>
            <code>summary.averageScore</code> é a média só dos completos,
            arredondada a 2 casas decimais. <code>null</code> quando
            ninguém entregou ainda.
          </li>
          <li>
            Sem paginação — assumimos turma de até centenas de alunos.
            Vire ticket no roadmap se virar gargalo.
          </li>
        </ul>
      </EndpointSection>

      <EndpointSection title="endReason">
        Quando <code>status: "completed"</code>, o campo <code>endReason</code>{" "}
        diz como a prova terminou:
        <ul>
          <li>
            <code>"submitted"</code>: aluno clicou "entregar" normalmente.
          </li>
          <li>
            <code>"time_expired"</code>: tempo estourou; prova foi
            auto-finalizada com as respostas que existiam.
          </li>
          <li>
            <code>"violation"</code>: modo estrito detectou 3 violações
            (troca de aba, copy, etc) e finalizou. Score reflete só o que
            o aluno conseguiu responder.
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
            description: "Id da prova.",
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
                A chave não tem o escopo <code>exams:read</code>.
              </>
            ),
          },
          {
            status: 404,
            code: "EXAM_NOT_FOUND",
            description:
              "Prova não existe ou não pertence à organização da chave.",
          },
        ]}
      />

      <Callout tone="tip" title="Tempo real">
        Pra reagir no momento exato em que cada aluno entrega, escute o
        webhook{" "}
        <Link
          href="/docs/webhooks/submission-completed"
          className="text-analytics-primary underline underline-offset-2"
        >
          <code>submission.completed</code>
        </Link>{" "}
        em vez de fazer polling neste endpoint.
      </Callout>
    </EndpointPage>
  );
}
