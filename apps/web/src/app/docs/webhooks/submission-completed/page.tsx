import type { Metadata } from "next";
import { WebhookEventPage } from "@/features/docs/components/webhook-event-page";
import {
  EndpointSection,
  ParamSection,
} from "@/features/docs/components/endpoint-section";
import { Callout } from "@/features/docs/components/callout";

export const metadata: Metadata = {
  title: "submission.completed · Webhooks",
};

export default function SubmissionCompletedPage() {
  return (
    <WebhookEventPage
      event="submission.completed"
      title="Aluno terminou a prova"
      summary="Dispara quando o aluno finaliza uma prova online — clicando em entregar, estourando o tempo, ou sendo auto-finalizado por violação. Traz nota, matrícula, professor e turma."
      exampleHeaders={`POST /seu-endpoint HTTP/1.1
Content-Type: application/json
X-Lucida-Signature: t=1745502192,v1=a1b2c3d4...`}
      examplePayload={`{
  "id": "evt_01HZXQWB3M2K8N4V7G1R5P9T6L",
  "event": "submission.completed",
  "environment": "live",
  "organizationId": "org_01HZX8F2M3V9K4N6P1R7T5Q8B2",
  "createdAt": "2026-04-24T14:05:47.000Z",
  "data": {
    "submissionId": "sub_01HZXPQ2J4V8M6N5T1R3G7K9L0",
    "examId": "exm_01HZX9WMR7D2Q8J4F3P5V6N2B1",
    "examTitle": "Prova bimestral — Funções",
    "classId": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
    "className": "Matemática — 9º ano A",
    "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
    "teacherName": "Carlos Mendes",
    "studentId": "std_01HZXPQ2GKTN7ZY5V1RP8M3Q4X",
    "studentName": "Maria Silva",
    "matricula": "2026-9A-014",
    "score": 8.4,
    "maxScore": 10,
    "correctCount": 21,
    "questionCount": 25,
    "submittedAt": "2026-04-24T14:05:47.000Z",
    "endReason": "submitted"
  }
}`}
    >
      <EndpointSection title="Quando dispara">
        Sempre que uma submissão online sai do estado{" "}
        <code>in_progress</code> e vai pra <code>submitted</code>. O
        evento traz a nota já calculada — não há janela entre "terminou"
        e "tem nota" como em workflows que separam entrega e correção.
      </EndpointSection>

      <EndpointSection title="Endereçamento">
        <ul>
          <li>
            <strong>Matrícula incluída:</strong> use{" "}
            <code>data.matricula</code> como chave pra reconciliar com o
            registro do aluno no seu sistema (SIS, CRM). É o mesmo valor
            que você enviou em <code>POST /v1/public/classes/:id/students</code>.
          </li>
          <li>
            <strong>Contexto institucional completo:</strong> o payload
            inclui ids e nomes de turma e professor — não precisa fazer
            chamadas extras pra montar relatórios.
          </li>
        </ul>
      </EndpointSection>

      <ParamSection
        title="Campos do data"
        params={[
          {
            name: "submissionId",
            type: "string",
            required: true,
            description:
              "Identificador único da submissão. Use como chave primária da entrega no seu lado.",
          },
          {
            name: "examId",
            type: "string",
            required: true,
            description: "Prova à qual a submissão pertence.",
          },
          {
            name: "examTitle",
            type: "string",
            required: true,
            description:
              "Título da prova no momento da entrega (snapshot — não atualiza se a prova for renomeada depois).",
          },
          {
            name: "classId",
            type: "string",
            required: true,
            description: "Turma da qual o aluno faz parte.",
          },
          {
            name: "className",
            type: "string",
            required: true,
            description: "Nome da turma no momento da entrega.",
          },
          {
            name: "teacherId",
            type: "string",
            required: true,
            description: "Professor responsável pela prova.",
          },
          {
            name: "teacherName",
            type: "string",
            required: true,
            description: "Nome do professor no momento da entrega.",
          },
          {
            name: "studentId",
            type: "string",
            required: true,
            description: "Identificador interno da Lucida pro aluno.",
          },
          {
            name: "studentName",
            type: "string",
            required: true,
            description: "Nome do aluno no momento da entrega.",
          },
          {
            name: "matricula",
            type: "string",
            required: true,
            description:
              "Matrícula institucional — o identificador externo que sua organização cadastrou pra esse aluno.",
          },
          {
            name: "score",
            type: "number",
            required: true,
            description: "Nota obtida (decimal).",
          },
          {
            name: "maxScore",
            type: "number",
            required: true,
            description: "Nota máxima da prova. Use pra calcular percentual.",
          },
          {
            name: "correctCount",
            type: "integer",
            required: true,
            description: "Quantas questões o aluno acertou.",
          },
          {
            name: "questionCount",
            type: "integer",
            required: true,
            description: "Total de questões da prova.",
          },
          {
            name: "submittedAt",
            type: "string (ISO-8601)",
            required: true,
            description: "Timestamp UTC da entrega.",
          },
          {
            name: "endReason",
            type: '"submitted" | "time_expired" | "violation"',
            required: true,
            description:
              "Como a prova terminou: aluno clicou entregar, tempo estourou ou foi auto-finalizada por violação no modo estrito.",
          },
        ]}
      />

      <Callout tone="tip" title="Padrão de uso">
        Bom gatilho pra atualizar o boletim no seu SIS, mandar e-mail
        pros pais com a nota, ou alimentar dashboards de desempenho. Use
        o <code>id</code> do envelope (não o <code>submissionId</code>)
        pra deduplicar entrega de webhook em caso de retry.
      </Callout>
    </WebhookEventPage>
  );
}
