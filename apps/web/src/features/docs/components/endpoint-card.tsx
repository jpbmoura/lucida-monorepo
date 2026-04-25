import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { MethodBadge, type HttpMethod } from "./method-badge";
import { ScopeBadge } from "./scope-badge";
import { ParamTable, type Param } from "./param-table";
import { CodeBlock } from "./code-block";

// Faixa lateral colorida por verbo — mesma paleta do MethodBadge mas em
// saturação mais alta pra funcionar como indicador visual rápido.
// Ajuda o leitor a "escanear" páginas com muitos endpoints.
const METHOD_STRIPE: Record<HttpMethod, string> = {
  GET: "before:bg-emerald-400",
  POST: "before:bg-analytics-primary",
  PATCH: "before:bg-amber-400",
  PUT: "before:bg-amber-400",
  DELETE: "before:bg-red-400",
};

interface EndpointCardProps {
  method: HttpMethod;
  path: string;
  description: React.ReactNode;
  scope: string;
  pathParams?: Param[];
  queryParams?: Param[];
  bodyParams?: Param[];
  request: string;
  responseSuccess: {
    status: number;
    body: string;
    description?: string;
  };
  responseErrors?: Array<{
    status: number;
    code: string;
    description: string;
  }>;
  /**
   * Âncora opcional pra linkar em outros locais da doc (ex: "veja
   * [criar turma](#classes-create)"). Vai no `id` do section.
   */
  anchor?: string;
}

/**
 * Anatomia completa de um endpoint — usado na referência. Cada seção
 * interna (Parâmetros / Request / Response) tem divisor sutil pra leitura
 * vertical confortável. Layout single-column no mobile; se quisermos
 * sidebar de exemplo depois, transformamos em 2-col com sticky.
 */
export function EndpointCard({
  method,
  path,
  description,
  scope,
  pathParams,
  queryParams,
  bodyParams,
  request,
  responseSuccess,
  responseErrors,
  anchor,
}: EndpointCardProps) {
  return (
    <section
      id={anchor}
      className={cn(
        // Faixa lateral via pseudo-elemento `before`: 3px de largura,
        // inset em -1px pra sobrepor a borda e bater na curva do card.
        "group relative flex flex-col gap-8 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 scroll-mt-20 md:p-8",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.75",
        METHOD_STRIPE[method],
      )}
    >
      {/* Header — verbo + path + escopo + descrição */}
      <header className="flex flex-col gap-4 border-b border-gray-100 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <MethodBadge method={method} />
          {anchor ? (
            // Anchor link aparece em hover no grupo — padrão GitHub/Vercel.
            // `relative` no parent + `absolute -left-*` no ícone evita
            // empurrar o path quando surge. Invisível (opacity 0) por
            // padrão; `focus-visible` também revela pra navegação por
            // teclado.
            <a
              href={`#${anchor}`}
              aria-label={`Link para ${path}`}
              className="group/anchor inline-flex items-center gap-2"
            >
              <code className="break-all font-mono text-[15px] font-medium text-ink md:text-base">
                {path}
              </code>
              <Hash className="size-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
            </a>
          ) : (
            <code className="break-all font-mono text-[15px] font-medium text-ink md:text-base">
              {path}
            </code>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Escopo
          </span>
          <ScopeBadge scope={scope} />
        </div>
        <p className="text-[14px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
          {description}
        </p>
      </header>

      {/* Parâmetros */}
      {pathParams && pathParams.length > 0 && (
        <ParamGroup title="Parâmetros de path" params={pathParams} />
      )}
      {queryParams && queryParams.length > 0 && (
        <ParamGroup title="Parâmetros de query" params={queryParams} />
      )}
      {bodyParams && bodyParams.length > 0 && (
        <ParamGroup title="Corpo da requisição" params={bodyParams} />
      )}

      {/* Request + Response side by side em md+ */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Exemplo — request
          </h4>
          <CodeBlock code={request} language="curl" />
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Response — {responseSuccess.status}
            {responseSuccess.description && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-normal normal-case tracking-normal text-emerald-700">
                {responseSuccess.description}
              </span>
            )}
          </h4>
          <CodeBlock code={responseSuccess.body} language="json" />
        </div>
      </div>

      {/* Erros possíveis */}
      {responseErrors && responseErrors.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Erros possíveis
          </h4>
          <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {responseErrors.map((e) => (
              <li
                key={`${e.status}-${e.code}`}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span className="shrink-0 rounded-md border border-red-100 bg-red-50 px-2 py-0.5 font-mono text-[12px] font-semibold text-red-700">
                  {e.status}
                </span>
                <div className="min-w-0 flex-1">
                  <code className="font-mono text-[12px] text-ink">
                    {e.code}
                  </code>
                  <div className="text-[13px] text-gray-600">
                    {e.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ParamGroup({
  title,
  params,
}: {
  title: string;
  params: Param[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
        {title}
      </h4>
      <ParamTable params={params} />
    </div>
  );
}
