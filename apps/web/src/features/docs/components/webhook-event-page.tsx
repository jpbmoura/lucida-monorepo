import { CodeBlock } from "./code-block";
import { EventBadge } from "./event-badge";

interface WebhookEventPageProps {
  /** Identificador do evento (ex.: "submission.created"). */
  event: string;
  /** Headline curto descritivo (ex.: "Submissão criada"). */
  title: string;
  /** Resumo de uma frase mostrando o que e quando dispara. */
  summary: string;
  children: React.ReactNode;
  /** Payload de exemplo (objeto inteiro, com envelope `id`/`event`/`data`). */
  examplePayload: string;
  /** Headers HTTP de exemplo do POST que sai da Lucida. */
  exampleHeaders?: string;
}

/**
 * Page wrapper pra documentação de UM evento de webhook. Mesma ideia da
 * EndpointPage: split-view com descrição à esquerda e payload sticky à
 * direita.
 */
export function WebhookEventPage({
  event,
  title,
  summary,
  children,
  examplePayload,
  exampleHeaders,
}: WebhookEventPageProps) {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto grid w-full max-w-7xl gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <div className="flex min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-4 border-b border-gray-100 pb-8">
            <EventBadge event={event} className="self-start" />
            <div className="flex flex-col gap-3">
              <h1 className="text-[2.25rem] font-medium leading-[1.05] tracking-tight text-ink md:text-[2.5rem]">
                {title}
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
                {summary}
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-10">{children}</div>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1 [scrollbar-width:thin]">
          {exampleHeaders && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
                  Headers
                </span>
                <span className="font-mono text-[11px] text-gray-500">
                  POST
                </span>
              </div>
              <CodeBlock code={exampleHeaders} language="http" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
                Payload
              </span>
              <span className="font-mono text-[11px] text-emerald-600">
                application/json
              </span>
            </div>
            <CodeBlock code={examplePayload} language="json" />
          </div>
        </aside>
      </div>
    </main>
  );
}
