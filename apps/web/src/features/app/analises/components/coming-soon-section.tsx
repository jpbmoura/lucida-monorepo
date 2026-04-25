import { BookOpen, Presentation, Sparkles } from "lucide-react";

export function ComingSoonSection() {
  return (
    <section className="mb-4">
      <header className="flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Em breve
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-ink">
          Mais do que provas
        </h2>
        <p className="text-sm text-gray-500">
          A Lulu vai ajudar em outros momentos da sua rotina — e as análises
          vão refletir isso aqui.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ComingCard
          icon={<Presentation className="size-4" />}
          title="Slides e materiais"
          description="Acompanhe quantas aulas você preparou com a IA e o quanto isso economizou de tempo."
        />
        <ComingCard
          icon={<BookOpen className="size-4" />}
          title="Planejamento de aulas"
          description="Cobertura de conteúdo programático e progresso do plano ao longo do bimestre."
        />
      </div>
    </section>
  );
}

function ComingCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex items-start gap-4 overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-gray-500 shadow-soft">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{title}</span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-brand-primary">
            <Sparkles className="size-3" />
            Em breve
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}
