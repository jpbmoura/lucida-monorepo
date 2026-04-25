import { Building2, TrendingUp } from "lucide-react";

/**
 * Mockup do dashboard institucional (Lucida Analytics). Estático, sem
 * interação — usado como ilustração na landing pra mostrar como é a vista
 * de coordenação. Tema roxo (`#6C3CFB`) reforça a identidade visual do
 * Analytics em contraste com o azul do Exam.
 */
export function AnalyticsMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(108,60,251,0.35)]">
      <MockTopbar />
      <div className="space-y-5 p-6">
        <Header />
        <BalanceCard />
        <KpiRow />
        <TopTeachers />
      </div>
    </div>
  );
}

function MockTopbar() {
  return (
    <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-3">
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="size-2.5 rounded-full bg-white/15" />
      <span className="ml-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-0.5 font-mono text-[10px] text-white/40">
        app.lucidaexam.com/analytics
      </span>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-analytics-light/70">
          <Building2 className="size-3" />
          Colégio Exemplo
        </div>
        <div className="mt-1 text-lg font-medium text-white">
          Visão geral —{" "}
          <span className="font-serif italic text-analytics-light">abril</span>
        </div>
      </div>
      <span className="rounded-md bg-analytics-primary/20 px-2 py-1 text-[11px] text-analytics-light">
        Pool ativo
      </span>
    </div>
  );
}

function BalanceCard() {
  return (
    <div className="rounded-xl border border-analytics-primary/20 bg-analytics-primary/15 p-4">
      <div className="text-[11px] text-white/60">Saldo institucional</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-3xl italic text-white">4.820</span>
        <span className="text-xs text-white/50">créditos</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-analytics-primary"
          style={{ width: "62%" }}
        />
      </div>
      <div className="mt-1.5 text-[10px] text-white/50">
        62% restantes do ciclo
      </div>
    </div>
  );
}

function KpiRow() {
  const kpis = [
    { label: "Professores", value: "18" },
    { label: "Provas / mês", value: "412" },
    { label: "Turmas ativas", value: "47" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="text-[10px] text-white/50">{k.label}</div>
          <div className="mt-0.5 text-xl font-medium tracking-tight text-white">
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopTeachers() {
  const teachers = [
    { name: "Wanderson S.", pct: 92 },
    { name: "Renata F.", pct: 78 },
    { name: "Carlos A.", pct: 64 },
  ];
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
        <TrendingUp className="size-3" />
        Maior uso este mês
      </div>
      <div className="space-y-1.5">
        {teachers.map((t) => (
          <div key={t.name} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-white/70">{t.name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-analytics-light"
                style={{ width: `${t.pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-[10px] tabular-nums text-white/50">
              {t.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
