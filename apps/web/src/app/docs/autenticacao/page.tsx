import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { ScopeBadge } from "@/features/docs/components/scope-badge";
import { PageWithToc } from "@/features/docs/components/page-with-toc";
import type { TocItem } from "@/features/docs/components/docs-toc";

export const metadata: Metadata = { title: "Autenticação" };

const TOC: TocItem[] = [
  { id: "header", title: "O header" },
  { id: "formato", title: "Formato da chave" },
  { id: "live-vs-test", title: "Live vs. Test" },
  { id: "escopos", title: "Escopos" },
  { id: "rotacao", title: "Rotação e revogação" },
  { id: "boas-praticas", title: "Boas práticas" },
];

const SCOPES: Array<{ scope: string; description: string }> = [
  { scope: "classes:read", description: "Ler turmas e seus metadados." },
  { scope: "classes:write", description: "Criar, editar e remover turmas." },
  { scope: "students:read", description: "Ler alunos e suas matrículas." },
  {
    scope: "students:write",
    description: "Criar, editar e remover alunos.",
  },
  { scope: "exams:read", description: "Ler provas e gabaritos." },
  {
    scope: "exams:write",
    description: "Criar, editar e publicar provas.",
  },
  {
    scope: "submissions:read",
    description: "Consultar submissões e notas finais.",
  },
  {
    scope: "webhooks:manage",
    description:
      "Criar, editar e remover endpoints de webhook via API (equivalente ao painel).",
  },
];

export default function AutenticacaoPage() {
  return (
    <PageWithToc tocItems={TOC}>
        <header className="hero-aura-analytics flex flex-col gap-4 border-b border-gray-100 pb-8">
          <Eyebrow>Fundamentos</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-[2.75rem]">
            Autenticação com{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              Bearer tokens
            </span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
            A API pública da Lucida autentica cada requisição via chave
            secreta passada no header <code>Authorization</code>. Cada
            chave pertence a uma organização, tem um ambiente fixo
            (live/test) e carrega uma lista de escopos.
          </p>
        </header>

        {/* Header format */}
        <section id="header" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">O header</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Toda requisição para <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">/v1/public/*</code>{" "}
            precisa incluir:
          </p>
          <CodeBlock
            code={`Authorization: Bearer lucida_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
          />
          <p className="text-[13px] text-gray-500">
            Sem header (ou com valor inválido) a resposta é{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
              401 UNAUTHORIZED
            </code>
            . Com chave válida mas escopo insuficiente, a resposta é{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
              403 FORBIDDEN
            </code>
            .
          </p>
        </section>

        {/* Formato da chave */}
        <section id="formato" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Formato da chave</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            As chaves seguem um formato previsível pra você conseguir
            detectá-las em code review, logs ou commits acidentais:
          </p>
          <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            <FormatRow
              fragment="lucida_"
              description="Prefixo fixo — identifica a origem."
            />
            <FormatRow
              fragment="live | test"
              description="Ambiente. Chaves `test` nunca consomem créditos da instituição e roteiam webhooks pra endpoints `test`."
            />
            <FormatRow
              fragment="_sk_"
              description="Separador que indica que é uma secret key (não uma publishable)."
            />
            <FormatRow
              fragment="xxxx…xxxx"
              description="32 bytes aleatórios codificados em base64url — ~43 caracteres. Gerado via RNG criptograficamente seguro."
            />
          </div>

          <Callout tone="warning" title="A chave só aparece uma vez">
            No painel, depois da criação, só mostramos o prefixo + os 4
            últimos caracteres (ex: <code>lucida_live_sk_••••••••abc4</code>).
            Se perder, gere uma nova e revogue a antiga.
          </Callout>
        </section>

        {/* Live vs Test */}
        <section id="live-vs-test" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Live vs. Test</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Os dois ambientes compartilham os mesmos dados da sua
            instituição — a diferença é comportamental:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <EnvCard
              title="live"
              description="Produção."
              tone="live"
              rows={[
                "Consome créditos da wallet institucional",
                "Só aceita URLs HTTPS em webhooks",
                "Disparos reais pros endpoints cadastrados como live",
              ]}
            />
            <EnvCard
              title="test"
              description="Sandbox pra integração."
              tone="test"
              rows={[
                "Nunca debita créditos da instituição",
                "Permite HTTP em localhost nos webhooks",
                "Disparos só pros endpoints cadastrados como test",
              ]}
            />
          </div>
          <p className="text-[13px] text-gray-500">
            Recomendamos ter pelo menos uma chave <code>test</code> no
            ambiente de staging do seu sistema e uma chave{" "}
            <code>live</code> em produção.
          </p>
        </section>

        {/* Escopos */}
        <section id="escopos" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Escopos</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Cada chave carrega uma lista explícita de escopos concedidos
            na criação. Rotas validam presença antes de executar — chave
            sem o escopo necessário recebe{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
              403
            </code>{" "}
            e a request não toca o banco.
          </p>
          <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {SCOPES.map((s) => (
              <li
                key={s.scope}
                className="flex items-center gap-4 px-4 py-3"
              >
                <ScopeBadge scope={s.scope} className="shrink-0" />
                <span className="text-[13px] text-gray-600">
                  {s.description}
                </span>
              </li>
            ))}
          </ul>
          <Callout tone="tip" title="Princípio do menor privilégio">
            Crie uma chave por integração e conceda só os escopos
            necessários. Um job que só envia notas não deveria conseguir
            criar turmas — isso limita o raio de explosão se a chave
            vazar.
          </Callout>
        </section>

        {/* Rotação */}
        <section id="rotacao" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Rotação e revogação</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">
            A Lucida não rotaciona chaves automaticamente. Revogar é{" "}
            <strong className="text-ink">imediato</strong> e{" "}
            <strong className="text-ink">irreversível</strong> — a partir do
            clique em "Revogar", qualquer request com essa chave recebe{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
              401
            </code>
            .
          </p>
          <p className="text-[14px] leading-relaxed text-gray-600">
            Pra rotacionar sem downtime, o padrão é:
          </p>
          <ol className="ml-4 flex list-decimal flex-col gap-1 text-[13px] text-gray-600">
            <li>Crie a nova chave com os escopos desejados</li>
            <li>Atualize o sistema consumidor pra usar a chave nova</li>
            <li>Revogue a antiga quando as últimas requests com ela tiverem drenado</li>
          </ol>
        </section>

        {/* Boas práticas */}
        <section id="boas-praticas" className="flex flex-col gap-4 scroll-mt-8">
          <h2 className="text-2xl font-medium text-ink">Boas práticas</h2>
          <ul className="ml-4 flex list-disc flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
            <li>
              Nunca commit chaves em repositório. Se isso acontecer por
              engano,{" "}
              <strong className="text-ink">revogue imediatamente</strong> —
              remover o commit não é suficiente (o valor já foi para os
              clones/caches).
            </li>
            <li>
              Armazene chaves em variáveis de ambiente ou gerenciadores
              de secrets (AWS Secrets Manager, Doppler, Vault).
            </li>
            <li>
              Prefira uma chave por workload em vez de compartilhar uma
              chave "mãe" entre múltiplas integrações — simplifica
              auditoria e limita rotação.
            </li>
            <li>
              Nunca envie a chave em parâmetros de URL. Query strings
              aparecem em logs de access e caches intermediários.
            </li>
          </ul>
        </section>

        <div className="flex justify-between gap-4 border-t border-gray-100 pt-8 text-[13px]">
          <Link
            href="/docs/quickstart"
            className="text-gray-500 hover:text-ink"
          >
            ← Quickstart
          </Link>
          <Link
            href="/docs/erros"
            className="text-gray-500 hover:text-ink"
          >
            Erros →
          </Link>
        </div>
    </PageWithToc>
  );
}

function FormatRow({
  fragment,
  description,
}: {
  fragment: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <code className="shrink-0 rounded-md bg-analytics-primary/10 px-2 py-0.5 font-mono text-[13px] text-analytics-primary">
        {fragment}
      </code>
      <span className="text-[13px] text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
        {description}
      </span>
    </div>
  );
}

function EnvCard({
  title,
  description,
  rows,
  tone,
}: {
  title: string;
  description: string;
  rows: string[];
  tone: "live" | "test";
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-2">
        <span
          className={
            tone === "live"
              ? "inline-flex items-center gap-1 rounded-full bg-analytics-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary"
              : "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500"
          }
        >
          <span
            className={
              tone === "live"
                ? "size-1.5 rounded-full bg-analytics-primary"
                : "size-1.5 rounded-full bg-gray-400"
            }
          />
          {title}
        </span>
        <span className="text-[12px] text-gray-500">{description}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r}
            className="flex gap-2 text-[13px] leading-relaxed text-gray-600"
          >
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-gray-400" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
