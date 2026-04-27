import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { CodeBlock } from "@/features/docs/components/code-block";
import { Callout } from "@/features/docs/components/callout";
import { EventBadge } from "@/features/docs/components/event-badge";
import { PageWithToc } from "@/features/docs/components/page-with-toc";
import type { TocItem } from "@/features/docs/components/docs-toc";

export const metadata: Metadata = { title: "Webhooks" };

const TOC: TocItem[] = [
  { id: "cadastro", title: "Cadastro" },
  { id: "payload", title: "Anatomia do payload" },
  { id: "assinatura", title: "Verificação" },
  { id: "retries", title: "Retries" },
  { id: "eventos", title: "Catálogo de eventos" },
];

interface EventLink {
  event: string;
  title: string;
  href: string;
  description: string;
}

const EVENT_LINKS: EventLink[] = [
  {
    event: "submission.completed",
    title: "Aluno terminou a prova",
    href: "/docs/webhooks/submission-completed",
    description:
      "Dispara assim que o aluno finaliza a prova. Traz nota, matrícula, professor e turma.",
  },
];

export default function WebhooksOverviewPage() {
  return (
    <PageWithToc tocItems={TOC} gap={12}>
      <header className="flex flex-col gap-4 border-b border-gray-100 pb-10">
        <Eyebrow>Eventos · Webhooks</Eyebrow>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
          Receba eventos em{" "}
          <span className="font-serif font-normal italic text-analytics-primary">
            tempo real
          </span>
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
          Webhooks entregam eventos (submissão criada, prova publicada, etc.)
          via HTTP POST num endpoint que sua instituição cadastra no painel.
          Use em vez de polling — é mais rápido, consome menos e escala.
        </p>
      </header>

      <Callout tone="warning" title="Disparos ainda não estão ativos">
        O cadastro de endpoints já funciona e gera signing secret válido. Os
        disparos reais serão ligados em iteração futura (Fase C). Esta
        documentação descreve o contrato que estará no ar então.
      </Callout>

      {/* Cadastro */}
      <section id="cadastro" className="flex flex-col gap-4 scroll-mt-8">
        <h2 className="text-2xl font-medium text-ink">Cadastro</h2>
        <p className="text-[14px] leading-relaxed text-gray-600">
          No painel{" "}
          <Link
            href="/analytics/desenvolvedores"
            className="text-analytics-primary underline underline-offset-2 hover:text-analytics-dark-01"
          >
            Analytics → Desenvolvedores
          </Link>
          , clique em <strong className="text-ink">Novo endpoint</strong> e
          informe:
        </p>
        <ul className="ml-4 flex list-disc flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
          <li>
            <strong className="text-ink">URL</strong> que vai receber o POST.
            Em <code>live</code> precisa ser HTTPS; em <code>test</code>{" "}
            aceitamos HTTP apenas se for localhost.
          </li>
          <li>
            <strong className="text-ink">Ambiente</strong>{" "}
            (<code>live</code>/<code>test</code>) — cada endpoint só recebe
            disparos do mesmo ambiente da chave que gerou o evento.
          </li>
          <li>
            <strong className="text-ink">Eventos</strong> que quer receber —
            só os marcados chegam (os demais são descartados silenciosamente).
          </li>
        </ul>
        <p className="text-[14px] leading-relaxed text-gray-600">
          O signing secret aparece <strong>uma única vez</strong> ao terminar
          o cadastro. Guarde — é ele que você vai usar pra verificar cada
          disparo.
        </p>
      </section>

      {/* Payload */}
      <section id="payload" className="flex flex-col gap-4 scroll-mt-8">
        <h2 className="text-2xl font-medium text-ink">Anatomia do payload</h2>
        <p className="text-[14px] leading-relaxed text-gray-600">
          Cada disparo é um <code>POST</code> com{" "}
          <code>Content-Type: application/json</code>. O corpo segue o mesmo
          envelope em todos os eventos:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "id": "evt_01HZXQWB3M2K8N4V7G1R5P9T6L",
  "event": "submission.created",
  "environment": "live",
  "organizationId": "org_01HZX8F2M3V9K4N6P1R7T5Q8B2",
  "createdAt": "2026-04-24T14:03:12.000Z",
  "data": { /* payload específico do evento — ver lista abaixo */ }
}`}
        />
        <p className="text-[13px] text-gray-500">
          <code>id</code> é único por disparo — use pra garantir idempotência
          do seu lado (não processar o mesmo evento duas vezes em caso de
          retry).
        </p>
      </section>

      {/* Assinatura */}
      <section id="assinatura" className="flex flex-col gap-4 scroll-mt-8">
        <h2 className="text-2xl font-medium text-ink">
          Verificação de assinatura
        </h2>
        <p className="text-[14px] leading-relaxed text-gray-600">
          Todo disparo traz o header{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[12px]">
            X-Lucida-Signature
          </code>{" "}
          — use-o pra garantir que o request veio mesmo da Lucida e não foi
          adulterado em trânsito.
        </p>
        <CodeBlock code={`X-Lucida-Signature: t=1745502192,v1=a1b2c3d4e5f6...`} />
        <p className="text-[14px] leading-relaxed text-gray-600">
          O formato é <code>t=TIMESTAMP,v1=HMAC</code>. O HMAC é{" "}
          <code>HMAC_SHA256(signingSecret, `${"${timestamp}.${body}"}`)</code>{" "}
          codificado em hex. Compare em <strong>tempo constante</strong> (pra
          evitar timing attacks) e rejeite disparos com timestamp mais antigo
          que 5 minutos (proteção contra replay).
        </p>
        <h3 className="mt-2 text-[15px] font-medium text-ink">
          Exemplo — verificação em Node.js
        </h3>
        <CodeBlock
          language="node"
          code={`import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export function verifyLucidaSignature(opts: {
  signingSecret: string;
  rawBody: string;            // o corpo cru, antes de qualquer parse
  signatureHeader: string;    // valor do header X-Lucida-Signature
}): boolean {
  const parts = Object.fromEntries(
    opts.signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const timestamp = Number(parts.t);
  const received = parts.v1;
  if (!Number.isFinite(timestamp) || !received) return false;

  // Rejeita disparos antigos — replay protection.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", opts.signingSecret)
    .update(\`\${timestamp}.\${opts.rawBody}\`)
    .digest("hex");

  const a = Buffer.from(received, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}`}
          scrollable
        />
        <Callout tone="warning" title="Use o corpo cru, não o parseado">
          Parsear + stringificar o JSON pode reordenar chaves e quebrar a
          assinatura. Use o raw body (o Express expõe via{" "}
          <code>express.raw()</code>; Fastify via{" "}
          <code>request.rawBody</code>).
        </Callout>
      </section>

      {/* Retries */}
      <section id="retries" className="flex flex-col gap-4 scroll-mt-8">
        <h2 className="text-2xl font-medium text-ink">Retries</h2>
        <p className="text-[14px] leading-relaxed text-gray-600">
          Consideramos entrega bem-sucedida quando seu endpoint responde{" "}
          <strong className="text-ink">2xx</strong> em até 10 segundos.
          Qualquer outra coisa (timeout, 4xx, 5xx) entra na fila de retry
          com backoff exponencial:
        </p>
        <ul className="ml-4 flex list-disc flex-col gap-1 text-[13px] text-gray-600">
          <li>1ª retentativa: ~1 minuto depois</li>
          <li>2ª: ~5 minutos</li>
          <li>3ª: ~30 minutos</li>
          <li>4ª: ~2 horas</li>
          <li>5ª: ~12 horas</li>
        </ul>
        <p className="text-[13px] text-gray-500">
          Após 5 falhas consecutivas, o endpoint é{" "}
          <strong className="text-ink">pausado automaticamente</strong>. O
          admin precisa revisar e reativar no painel.
        </p>
      </section>

      {/* Catálogo */}
      <section id="eventos" className="flex flex-col gap-4 scroll-mt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-medium text-ink">Catálogo de eventos</h2>
          <p className="text-[13px] text-gray-500">
            Cada evento tem sua própria página com schema completo, exemplo
            de payload e dicas operacionais. Ignore eventos desconhecidos no
            seu handler — novos podem ser adicionados sem quebra de contrato.
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {EVENT_LINKS.map((ev) => (
            <li key={ev.href}>
              <Link
                href={ev.href}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/60"
              >
                <EventBadge event={ev.event} className="shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:ml-2">
                  <span className="text-[14px] font-medium text-ink">
                    {ev.title}
                  </span>
                  <span className="text-[12.5px] text-gray-500">
                    {ev.description}
                  </span>
                </div>
                <ArrowRight className="size-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageWithToc>
  );
}
