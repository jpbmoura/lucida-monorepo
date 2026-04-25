import { cn } from "@/lib/utils";

export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: React.ReactNode;
  /** Valor default exibido entre parênteses na coluna tipo. */
  defaultValue?: string;
}

interface ParamTableProps {
  params: Param[];
  className?: string;
}

/**
 * Tabela de parâmetros (path, query ou body). Em vez de <table>, uso
 * stack de divs com borda pra ficar legível em mobile sem rolagem
 * horizontal. Padrão parecido com Mintlify moderno.
 */
export function ParamTable({ params, className }: ParamTableProps) {
  if (params.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3 text-[13px] text-gray-500">
        Sem parâmetros.
      </div>
    );
  }
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white",
        className,
      )}
    >
      {params.map((p) => (
        <li key={p.name} className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-[13px] font-medium text-ink">
              {p.name}
            </code>
            <span className="text-[11px] text-gray-500">
              {p.type}
              {p.defaultValue && (
                <>
                  {" · "}
                  padrão <code className="font-mono">{p.defaultValue}</code>
                </>
              )}
            </span>
            {p.required ? (
              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-600">
                obrigatório
              </span>
            ) : (
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                opcional
              </span>
            )}
          </div>
          <div className="text-[13px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
            {p.description}
          </div>
        </li>
      ))}
    </ul>
  );
}
