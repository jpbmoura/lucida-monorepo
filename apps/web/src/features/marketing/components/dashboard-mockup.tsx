import {
  Bell,
  ChevronDown,
  FileText,
  Plus,
  BarChart3,
  Users,
  Clock,
  ArrowUp,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-pop">
      <MockTopbar />
      <div className="px-6 pb-8 pt-7 md:px-10 md:pt-8">
        <MockHeader />
        <div className="mt-8">
          <MockKpiGrid />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.55fr_1fr]">
          <MockChart />
          <MockActivity />
        </div>
      </div>
    </div>
  );
}

function MockTopbar() {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white/90 px-4 backdrop-blur md:h-16 md:px-6">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-3">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-primary text-[11px] font-semibold text-white">
          9A
        </span>
        <div className="hidden flex-col text-left leading-tight md:flex">
          <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-gray-400">Turma ativa</span>
          <span className="text-[12px] font-medium text-ink">9º Ano A — Matemática</span>
        </div>
        <ChevronDown className="size-3.5 text-gray-400" />
      </div>

      <div className="flex-1" />

      <button className="relative grid size-9 place-items-center rounded-xl text-gray-500 hover:bg-gray-100" aria-hidden>
        <Bell className="size-4" />
        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-primary ring-2 ring-white" />
      </button>

      <div className="mx-1 h-5 w-px bg-gray-200" />

      <div className="flex items-center gap-2 rounded-pill py-1 pr-3">
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-dark-01 text-[11px] font-semibold text-white">
          JP
        </span>
        <span className="hidden text-[12px] font-medium text-ink md:inline">João Pedro</span>
        <ChevronDown className="hidden size-3.5 text-gray-400 md:inline" />
      </div>
    </div>
  );
}

function MockHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-5 border-b border-gray-100 pb-7 md:flex-row md:items-end md:gap-10">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Quarta-feira, 22 de abril
        </div>
        <h3 className="text-3xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[2.6rem]">
          Bom dia, João —{" "}
          <span className="font-serif font-normal italic text-brand-primary">vamos ensinar</span>
        </h3>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-gray-500">
          Suas turmas têm 3 provas com correção pendente e 2 avaliações agendadas para esta semana.
        </p>
      </div>

      <button
        aria-hidden
        className="flex shrink-0 items-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-[13px] font-medium text-white"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
        Nova prova
      </button>
    </div>
  );
}

function MockKpiGrid() {
  const kpis = [
    {
      label: "Provas ativas",
      value: "12",
      unit: null,
      icon: FileText,
      trend: { dir: "up" as const, label: "+3" },
      context: "vs. semana anterior",
      featured: true,
    },
    {
      label: "Correções pendentes",
      value: "47",
      unit: null,
      icon: Clock,
      trend: { dir: "neutral" as const, label: "em 3 provas" },
      context: "2 prioritárias",
    },
    {
      label: "Alunos ativos",
      value: "238",
      unit: "/256",
      icon: Users,
      trend: { dir: "up" as const, label: "93%" },
      context: "presença média",
    },
    {
      label: "Média geral",
      value: "7,4",
      unit: "/10",
      icon: BarChart3,
      trend: { dir: "up" as const, label: "+0,3" },
      context: "último bimestre",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 md:grid-cols-4">
      {kpis.map((kpi) => {
        const featured = kpi.featured;
        return (
          <div
            key={kpi.label}
            className={
              featured
                ? "flex flex-col gap-4 bg-ink p-5 text-white"
                : "flex flex-col gap-4 bg-white p-5"
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={
                  featured
                    ? "text-[10px] font-medium uppercase tracking-[0.08em] text-white/60"
                    : "text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500"
                }
              >
                {kpi.label}
              </span>
              <span
                className={
                  featured
                    ? "grid size-6 place-items-center rounded-md bg-white/10 text-white"
                    : "grid size-6 place-items-center rounded-md bg-gray-50 text-gray-500"
                }
              >
                <kpi.icon className="size-3" />
              </span>
            </div>
            <div className={featured ? "flex items-baseline gap-1 text-[2.25rem] font-medium leading-none tracking-tighter text-white" : "flex items-baseline gap-1 text-[2.25rem] font-medium leading-none tracking-tighter text-ink"}>
              {kpi.value}
              {kpi.unit && (
                <span className={featured ? "text-sm font-normal text-white/40" : "text-sm font-normal text-gray-400"}>
                  {kpi.unit}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <TrendBadge trend={kpi.trend} featured={featured} />
              <span className={featured ? "text-[10px] text-white/50" : "text-[10px] text-gray-400"}>
                {kpi.context}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TrendBadgeProps {
  trend: { dir: "up" | "down" | "neutral"; label: string };
  featured?: boolean;
}

function TrendBadge({ trend, featured }: TrendBadgeProps) {
  if (trend.dir === "neutral") {
    return (
      <span className={featured ? "rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70" : "rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"}>
        {trend.label}
      </span>
    );
  }
  return (
    <span
      className={
        featured
          ? "inline-flex items-center gap-1 rounded-md bg-brand-light/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-light"
          : "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
      }
    >
      <ArrowUp className="size-2.5" strokeWidth={3} />
      {trend.label}
    </span>
  );
}

function MockChart() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-medium tracking-tight text-ink">
            Desempenho <span className="font-serif italic text-gray-500">por prova</span>
          </h4>
          <p className="mt-1 text-[11px] text-gray-500">Média da turma nas últimas 8 avaliações</p>
        </div>
        <div className="flex items-center gap-1 rounded-pill bg-gray-50 p-0.5">
          {["Semana", "Mês", "Bimestre"].map((t) => (
            <span
              key={t}
              className={
                t === "Mês"
                  ? "rounded-pill bg-white px-3 py-1 text-[10px] font-medium text-ink shadow-soft"
                  : "px-3 py-1 text-[10px] font-medium text-gray-500"
              }
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-6 border-b border-gray-100 pb-4">
        <ChartStat label="Média do mês" value="7,4" accent />
        <ChartStat label="Maior nota" value="9,2" />
        <ChartStat label="Menor nota" value="5,1" />
      </div>

      <ChartSvg />
    </div>
  );
}

function ChartStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-medium leading-none tracking-tighter text-ink">
        {accent ? (
          <>
            {value.split(",")[0]}
            <span className="font-serif italic text-brand-primary">,{value.split(",")[1]}</span>
          </>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function ChartSvg() {
  return (
    <svg viewBox="0 0 720 240" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#f4f4f4" strokeWidth="1">
        <line x1="40" y1="40" x2="700" y2="40" />
        <line x1="40" y1="90" x2="700" y2="90" />
        <line x1="40" y1="140" x2="700" y2="140" />
        <line x1="40" y1="190" x2="700" y2="190" />
      </g>
      <g fill="#a3a3a3" fontSize="10" textAnchor="end" fontFamily="var(--font-sans)">
        <text x="32" y="44">10</text>
        <text x="32" y="94">8</text>
        <text x="32" y="144">6</text>
        <text x="32" y="194">4</text>
      </g>
      <line x1="40" y1="65" x2="700" y2="65" stroke="#7FBDF4" strokeWidth="1.5" strokeDasharray="4 4" />
      <defs>
        <linearGradient id="mock-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 80 115 L 160 90 L 240 135 L 320 80 L 400 100 L 480 65 L 560 85 L 640 70 L 640 215 L 80 215 Z"
        fill="url(#mock-area)"
      />
      <path
        d="M 80 115 L 160 90 L 240 135 L 320 80 L 400 100 L 480 65 L 560 85 L 640 70"
        fill="none"
        stroke="#0a0a0a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#ffffff" stroke="#0a0a0a" strokeWidth="2">
        {[
          [80, 115],
          [160, 90],
          [240, 135],
          [320, 80],
          [400, 100],
          [480, 65],
          [560, 85],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
        ))}
      </g>
      <circle cx="640" cy="70" r="12" fill="#007AFF" fillOpacity="0.12" />
      <circle cx="640" cy="70" r="5" fill="#007AFF" stroke="#ffffff" strokeWidth="3" />
      <g fill="#a3a3a3" fontSize="10" textAnchor="middle" fontFamily="var(--font-sans)">
        {["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"].map((label, i) => (
          <text key={label} x={80 + i * 80} y={232}>
            {label}
          </text>
        ))}
      </g>
      <g>
        <rect x="596" y="25" width="88" height="30" rx="7" fill="#0a0a0a" />
        <text x="640" y="38" fill="#a3a3a3" fontSize="8" fontFamily="var(--font-sans)" textAnchor="middle" letterSpacing="0.5">
          PROVA 8
        </text>
        <text x="640" y="49" fill="#ffffff" fontSize="11" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
          Média 8,3
        </text>
      </g>
    </svg>
  );
}

function MockActivity() {
  const items = [
    {
      icon: CheckCircle2,
      title: "Prova de Álgebra corrigida",
      meta: ["9º A", "há 12 min"],
      value: "7,8",
      tone: "blue",
    },
    {
      icon: Users,
      title: "23 alunos submeteram",
      meta: ["Geometria P3", "há 1h"],
      tone: "muted",
    },
    {
      icon: FileText,
      title: "Nova prova gerada pela Lulu",
      meta: ["Funções", "há 3h"],
      tone: "dark",
    },
    {
      icon: Calendar,
      title: "Avaliação agendada",
      meta: ["28 de abril", "ontem"],
      tone: "muted",
    },
  ] as const;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-medium tracking-tight text-ink">
            Atividade <span className="font-serif italic text-gray-500">recente</span>
          </h4>
          <p className="mt-1 text-[11px] text-gray-500">Últimas ações nas suas turmas</p>
        </div>
      </div>

      <ul className="flex flex-col">
        {items.map((item, i) => {
          const tone =
            item.tone === "blue"
              ? "bg-brand-primary/10 text-brand-primary"
              : item.tone === "dark"
                ? "bg-ink text-white"
                : "bg-gray-50 text-gray-600";
          return (
            <li
              key={item.title}
              className={`flex items-center gap-3 py-3 ${
                i < items.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                <item.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{item.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                  <span>{item.meta[0]}</span>
                  <span className="size-0.5 rounded-full bg-gray-300" />
                  <span>{item.meta[1]}</span>
                </div>
              </div>
              {"value" in item && item.value && (
                <span className="text-[13px] font-medium tabular-nums text-ink">{item.value}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
