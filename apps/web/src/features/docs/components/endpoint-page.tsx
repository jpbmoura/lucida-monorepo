import { Hash } from "lucide-react";
import { MethodBadge, type HttpMethod } from "./method-badge";
import { ScopeBadge } from "./scope-badge";
import { EndpointSidekick } from "./endpoint-sidekick";

const METHOD_STRIPE: Record<HttpMethod, string> = {
  GET: "bg-emerald-400",
  POST: "bg-sky-500",
  PATCH: "bg-amber-400",
  PUT: "bg-amber-400",
  DELETE: "bg-rose-400",
};

interface EndpointPageProps {
  /** Verbo HTTP — define cor do stripe e do badge. */
  method: HttpMethod;
  /** Path completo da rota (ex.: "/v1/public/classes"). */
  path: string;
  /** Headline curto (ex.: "Listar turmas"). Vai como h1 da página. */
  title: string;
  /**
   * Subtítulo opcional pra explicar em uma frase o que a rota faz.
   * Aparece logo abaixo do h1.
   */
  summary?: string;
  scope: string;
  /** Conteúdo da coluna esquerda — descrição rica, params, erros. */
  children: React.ReactNode;
  /** Conteúdo do painel direito — request + response sticky. */
  sidekick: React.ComponentProps<typeof EndpointSidekick>;
  /**
   * Anchor do header pra link copiável (estilo GitHub). Não é
   * estritamente necessário em pages onde a rota é a página inteira,
   * mas mantém consistência com o EndpointCard antigo.
   */
  anchor?: string;
}

/**
 * Page wrapper pra documentação de UM endpoint REST. Layout split em
 * xl+: descrição/params à esquerda + Request/Response sticky à direita.
 * Em viewports menores, vira coluna única (sidekick desce pro fluxo).
 *
 * O container respeita a sidebar (sem max-w externo) — usa quase toda a
 * largura disponível pra acomodar o painel direito largo o suficiente
 * pra exemplos JSON sem quebra de linha agressiva.
 */
export function EndpointPage({
  method,
  path,
  title,
  summary,
  scope,
  children,
  sidekick,
  anchor,
}: EndpointPageProps) {
  return (
    <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto grid w-full max-w-7xl gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <div className="flex min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-4 border-b border-gray-100 pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={method} />
              {anchor ? (
                <a
                  href={`#${anchor}`}
                  aria-label={`Link para ${path}`}
                  className="group/anchor inline-flex items-center gap-2"
                >
                  <code className="break-all font-mono text-[15px] font-medium text-ink md:text-base">
                    {path}
                  </code>
                  <Hash className="size-4 text-gray-300 opacity-0 transition-opacity group-hover/anchor:opacity-100" />
                </a>
              ) : (
                <code className="break-all font-mono text-[15px] font-medium text-ink md:text-base">
                  {path}
                </code>
              )}
              <span
                aria-hidden
                className={`ml-auto h-1 w-12 rounded-full ${METHOD_STRIPE[method]}`}
              />
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-[2.25rem] font-medium leading-[1.05] tracking-tight text-ink md:text-[2.5rem]">
                {title}
              </h1>
              {summary && (
                <p className="max-w-2xl text-[15px] leading-relaxed text-gray-500">
                  {summary}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                  Escopo
                </span>
                <ScopeBadge scope={scope} />
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-10">{children}</div>
        </div>

        <EndpointSidekick {...sidekick} />
      </div>
    </main>
  );
}
