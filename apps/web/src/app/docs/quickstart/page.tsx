import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quickstart" };

interface Step {
  title: string;
  body: React.ReactNode;
}

export default function QuickstartPage() {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
          <Eyebrow>Quickstart</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            Da conta à primeira{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              chamada
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            Quatro passos pra sair do zero e ter uma resposta com dados
            reais da sua instituição.
          </p>
        </header>

        <Timeline steps={STEPS} />
      </div>
    </main>
  );
}

const STEPS: Step[] = [
  {
    title: "Crie uma conta institucional",
    body: (
      <p>
        Se sua instituição ainda não tem conta na Lucida, comece por{" "}
        <Link
          href="/organizacoes/entrar"
          className="text-analytics-primary underline underline-offset-2 hover:text-analytics-dark-01"
        >
          Organizações · Entrar
        </Link>
        . Você precisa ser o <strong className="text-ink">owner</strong> ou{" "}
        <strong className="text-ink">admin</strong> da organização pra
        conseguir gerar chaves.
      </p>
    ),
  },
  {
    title: "Gere uma chave de API",
    body: (
      <>
        <p>
          No painel institucional, vá em{" "}
          <Link
            href="/analytics/desenvolvedores"
            className="text-analytics-primary underline underline-offset-2 hover:text-analytics-dark-01"
          >
            Analytics → Desenvolvedores
          </Link>{" "}
          e clique em <strong className="text-ink">Nova chave</strong>. Escolha:
        </p>
        <ul>
          <li>
            <strong className="text-ink">Nome</strong>: identifica onde a
            chave é usada (ex.: "SIS Totvs", "CRM HubSpot").
          </li>
          <li>
            <strong className="text-ink">Ambiente</strong>: <code>test</code>{" "}
            pra explorar sem consumir créditos; <code>live</code> pra
            produção.
          </li>
          <li>
            <strong className="text-ink">Escopos</strong>: marque só o
            necessário (princípio do menor privilégio).
          </li>
        </ul>
        <Callout tone="warning">
          A chave é exibida <strong>uma única vez</strong> logo após a
          criação. Copie e guarde em um vault ou variável de ambiente —
          nunca commit em repositório.
        </Callout>
      </>
    ),
  },
  {
    title: "Faça a primeira chamada",
    body: (
      <>
        <p>
          Substitua <code>SEU_TOKEN</code> pela chave que você acabou de
          gerar:
        </p>
        <CodeBlock
          language="curl"
          code={`curl https://api.lucida.com.br/v1/public/classes \\
  -H "Authorization: Bearer SEU_TOKEN"`}
        />
      </>
    ),
  },
  {
    title: "Confira a resposta",
    body: (
      <>
        <p>
          Em sucesso, a API devolve <code>200 OK</code> com um array de
          turmas dentro de <code>data</code>:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "data": [
    {
      "id": "cls_01HZX9FBTY8PV6K4G7M2W3RN8A",
      "name": "Matemática — 9º ano A",
      "teacherId": "usr_01HZX9A8V4KT1N2RP7QM0W5B3X",
      "studentsCount": 28,
      "createdAt": "2026-02-12T14:23:10.000Z"
    }
  ],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}`}
        />
        <p>
          Se receber <code>401</code>, revise o header{" "}
          <code>Authorization</code>. Se <code>403</code>, a chave não tem
          o escopo <code>classes:read</code>.
        </p>
      </>
    ),
  },
];

/**
 * Timeline com track vertical conectando os nós numerados. Cada step
 * tem uma "bolinha" alinhada com seu heading + uma linha vertical que
 * desce até a próxima — desenha uma trilha visual de progresso.
 *
 * Implementação:
 *  - O <ol> tem `relative` pra ancorar a track.
 *  - Cada <li> é grid `[40px_1fr]` (gutter pra coluna do nó).
 *  - A track é um pseudo-element absolute na primeira coluna, com
 *    `top` e `bottom` pra começar/terminar exatamente nas bolinhas
 *    extremas (não atravessar a bolinha do primeiro/último).
 *  - Os nós ficam `z-10` por cima da track.
 */
function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative flex flex-col gap-12">
      {/* Track vertical — começa na metade da primeira bolinha,
          termina na metade da última (top=20px, bottom: depende do
          último). Usamos `inset-y-5` que mantém esse padding em
          ambas pontas pra um track simétrico. */}
      <span
        aria-hidden
        className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-analytics-primary/30 via-gray-200 to-gray-100"
      />

      {steps.map((step, idx) => (
        <li
          key={step.title}
          className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-6"
        >
          <StepNode index={idx + 1} />
          <StepBody title={step.title}>{step.body}</StepBody>
        </li>
      ))}
    </ol>
  );
}

function StepNode({ index }: { index: number }) {
  return (
    <div className="relative z-10 flex items-start justify-center">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border bg-white",
          "border-analytics-primary/20 text-analytics-primary",
          "shadow-[0_0_0_4px_rgb(255_255_255)]",
        )}
      >
        <span className="font-serif text-lg italic leading-none">{index}</span>
      </span>
    </div>
  );
}

function StepBody({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 pt-1.5">
      <h2 className="text-[1.35rem] font-medium tracking-tight text-ink">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_p]:m-0 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:ml-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </div>
  );
}
