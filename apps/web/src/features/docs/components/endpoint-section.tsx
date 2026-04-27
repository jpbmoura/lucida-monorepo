import { cn } from "@/lib/utils";
import { ParamTable, type Param } from "./param-table";

interface EndpointSectionProps {
  title: string;
  /** Sub-título opcional (cinza, fonte menor) abaixo do título. */
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bloco semântico dentro de uma EndpointPage — header padronizado +
 * conteúdo. Substitui as várias <h2>+<p> avulsas que existiam antes.
 */
export function EndpointSection({
  title,
  hint,
  children,
  className,
}: EndpointSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500">
          {title}
        </h2>
        {hint && (
          <p className="text-[13px] leading-relaxed text-gray-500 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
            {hint}
          </p>
        )}
      </div>
      <div className="text-[14px] leading-relaxed text-gray-700 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_strong]:font-medium [&_strong]:text-ink [&_ul]:ml-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

/**
 * Atalho pra renderizar tabela de parâmetros como section. Mantém
 * tipografia/espaçamento consistente com EndpointSection.
 */
export function ParamSection({
  title,
  hint,
  params,
}: {
  title: string;
  hint?: React.ReactNode;
  params: Param[];
}) {
  return (
    <EndpointSection title={title} hint={hint}>
      <ParamTable params={params} />
    </EndpointSection>
  );
}

interface ErrorRow {
  status: number;
  code: string;
  description: React.ReactNode;
}

/** Lista de erros possíveis — visual igual ao do EndpointCard antigo. */
export function ErrorListSection({
  errors,
}: {
  errors: ErrorRow[];
}) {
  if (errors.length === 0) return null;
  return (
    <EndpointSection title="Erros possíveis">
      <ul className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
        {errors.map((e) => (
          <li
            key={`${e.status}-${e.code}`}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span className="shrink-0 rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 font-mono text-[12px] font-semibold text-rose-700">
              {e.status}
            </span>
            <div className="min-w-0 flex-1">
              <code className="font-mono text-[12px] text-ink">{e.code}</code>
              <div className="text-[13px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11.5px]">
                {e.description}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </EndpointSection>
  );
}
