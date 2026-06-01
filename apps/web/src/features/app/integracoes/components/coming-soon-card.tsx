import type { ReactNode } from "react";

interface ComingSoonCardProps {
  name: string;
  description: string;
  /** Logo da integração (tile size-10). */
  logo: ReactNode;
}

/** Card desabilitado de integração futura — prova que a grade escala. */
export function ComingSoonCard({ name, description, logo }: ComingSoonCardProps) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-6 opacity-70">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 grayscale">{logo}</span>
          <h3 className="text-[15px] font-medium tracking-tight text-gray-500">
            {name}
          </h3>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          em breve
        </span>
      </header>
      <p className="text-[13px] leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}
