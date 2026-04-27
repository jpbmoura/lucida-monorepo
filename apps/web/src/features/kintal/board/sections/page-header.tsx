import { CreateCardButton } from "../components/create-card-button";
import type { StaffMember } from "@/features/kintal/acessos/types";

interface BoardPageHeaderProps {
  totalCards: number;
  staff: StaffMember[];
}

// Mesma linguagem das outras telas Kintal: eyebrow + H1 grande com
// destaque italic serif, subtítulo e CTA primário à direita (como em
// /kintal/acessos).
export function BoardPageHeader({ totalCards, staff }: BoardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Operações internas
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          Board do{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            time
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Centraliza demandas, bugs e iniciativas internas. Concluídos somem
          do board após 30 dias.
          {totalCards > 0 && (
            <>
              {" "}
              <span className="text-gray-400">
                · {totalCards} {totalCards === 1 ? "card" : "cards"}
              </span>
            </>
          )}
        </p>
      </div>

      <CreateCardButton staff={staff} />
    </div>
  );
}
