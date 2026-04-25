import { cn } from "@/lib/utils";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-analytics-primary/10 text-analytics-primary",
  PATCH: "bg-amber-100 text-amber-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

/**
 * Badge fixo-width pra o verbo HTTP de um endpoint. Largura mínima
 * garante alinhamento vertical quando vários endpoints aparecem
 * empilhados (ex: lista de rotas de um recurso).
 */
export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
        METHOD_STYLES[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
