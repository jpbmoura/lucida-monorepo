import { cn } from "@/lib/utils";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

// Paleta deliberadamente sem o roxo do Analytics — POST usa sky pra não
// confundir com a cor do tema da própria documentação. Mesma paleta do
// stripe lateral em EndpointCard.
const METHOD_STYLES: Record<HttpMethod, { soft: string; solid: string }> = {
  GET: {
    soft: "bg-emerald-100 text-emerald-700",
    solid: "bg-emerald-500 text-white",
  },
  POST: {
    soft: "bg-sky-100 text-sky-700",
    solid: "bg-sky-500 text-white",
  },
  PATCH: {
    soft: "bg-amber-100 text-amber-700",
    solid: "bg-amber-500 text-white",
  },
  PUT: {
    soft: "bg-amber-100 text-amber-700",
    solid: "bg-amber-500 text-white",
  },
  DELETE: {
    soft: "bg-rose-100 text-rose-700",
    solid: "bg-rose-500 text-white",
  },
};

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
  /** "soft" = fundo claro com texto colorido (default). "solid" = fundo
   * preenchido com texto branco — usado na sidebar pra contraste maior
   * em fontes pequenas. */
  variant?: "soft" | "solid";
  /** "md" = padrão (h ~6). "xs" = compacto (h ~4) pra inline em listas
   * densas. */
  size?: "xs" | "md";
}

/**
 * Badge fixo-width pro verbo HTTP. min-w garante alinhamento vertical
 * quando vários endpoints aparecem empilhados (sidebar, overview do
 * recurso). `variant=solid` é usado na sidebar pra leitura rápida em
 * fonte pequena; `soft` é o default no header de cada página.
 */
export function MethodBadge({
  method,
  className,
  variant = "soft",
  size = "md",
}: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wide",
        size === "md" && "min-w-13 rounded-md px-2 py-0.5 text-[11px]",
        size === "xs" && "min-w-10 rounded px-1.5 py-px text-[9.5px]",
        METHOD_STYLES[method][variant],
        className,
      )}
    >
      {method}
    </span>
  );
}
