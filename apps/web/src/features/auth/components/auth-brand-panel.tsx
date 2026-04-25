type PanelVariant = "exam" | "analytics";

interface AuthBrandPanelProps {
  variant?: PanelVariant;
}

export function AuthBrandPanel({ variant = "exam" }: AuthBrandPanelProps) {
  if (variant === "analytics") {
    return <AnalyticsPanel />;
  }
  return <ExamPanel />;
}

function ExamPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-super-dark text-brand-off-white lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(0,122,255,0.35),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-light/30 to-transparent"
      />

      <LuluDecoration color="#7FBDF4" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <div className="text-xs font-medium uppercase tracking-[0.15em] text-brand-light">
          Lucida Exam
        </div>

        <div className="max-w-md">
          <p className="font-serif text-4xl italic leading-[1.1] text-brand-light">
            “Ganho horas toda semana.”
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Feita por e para professores. Crie provas com IA, aplique online ou impresso e
            receba a análise da turma em tempo real.
          </p>
        </div>

        <div className="text-xs text-white/50">
          Usada por <span className="font-medium text-white">+3 mil professores</span> no Brasil.
        </div>
      </div>
    </aside>
  );
}

function AnalyticsPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-super-dark text-brand-off-white lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(108,60,251,0.4),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-analytics-light/30 to-transparent"
      />

      <LuluDecoration color="#927AFC" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <div className="text-xs font-medium uppercase tracking-[0.15em] text-analytics-light">
          Lucida Analytics
        </div>

        <div className="max-w-md">
          <p className="font-serif text-4xl italic leading-[1.1] text-analytics-light">
            “Vejo a escola inteira num olhar.”
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            O ambiente da sua instituição. Acompanhe o desempenho de professores, turmas e
            alunos com relatórios agregados e alertas em tempo real.
          </p>
        </div>

        <div className="text-xs text-white/50">
          Gestão com a leveza da Lulu.
        </div>
      </div>
    </aside>
  );
}

function LuluDecoration({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-24 -top-24 size-[500px] opacity-[0.06]"
    >
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="100" rx="80" ry="70" fill={color} />
        <ellipse cx="40" cy="100" rx="20" ry="50" fill={color} />
        <ellipse cx="160" cy="100" rx="15" ry="40" fill={color} />
        <circle cx="75" cy="95" r="12" fill="#051E2C" />
        <circle cx="125" cy="95" r="12" fill="#051E2C" />
      </svg>
    </div>
  );
}
