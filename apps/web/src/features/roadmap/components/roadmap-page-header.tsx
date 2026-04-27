import { CreateItemDialog } from "./create-item-dialog";

interface RoadmapPageHeaderProps {
  isStaff: boolean;
}

// Header padrão Lucida — eyebrow com pulse-dot, headline grande com
// destaque italic em serif, sub texto. CTA staff aparece à direita.
export function RoadmapPageHeader({ isStaff }: RoadmapPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Roadmap público
          {isStaff && (
            <span className="ml-2 rounded-pill bg-ink px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white">
              Modo staff
            </span>
          )}
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.25rem]">
          Pra onde a Lucida{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            está indo
          </span>
        </h1>
        <p className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-gray-500">
          O que estamos construindo, o que vem depois e o que veio da
          comunidade. Sua sugestão e seu voto entram nessa lista.
        </p>
      </div>

      {isStaff && <CreateItemDialog />}
    </div>
  );
}
