import { Activity, Calendar, FileText, History } from "lucide-react";
import type {
  KintalInstitutionDetail,
  KintalInstitutionUsage,
} from "../types";

export function UsagePanel({
  institution,
}: {
  institution: KintalInstitutionDetail;
}) {
  const u = institution.usage;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <header className="pb-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Uso
        </div>
        <h2 className="mt-1 flex items-baseline gap-2 text-xl font-medium tracking-tight text-ink">
          Consumo
          <span className="text-xs font-normal text-gray-400">
            {windowLabel(u)}
          </span>
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric
          icon={<Activity className="size-4" />}
          label="Créditos consumidos"
          value={u.creditsConsumed.toLocaleString("pt-BR")}
        />
        <Metric
          icon={<FileText className="size-4" />}
          label="Provas criadas"
          value={u.examsGenerated.toLocaleString("pt-BR")}
        />
        <Metric
          icon={<History className="size-4" />}
          label="Total vitalício"
          value={u.lifetimeCreditsConsumed.toLocaleString("pt-BR")}
          hint="todas as épocas"
        />
      </div>
    </section>
  );
}

function windowLabel(u: KintalInstitutionUsage): string {
  const from = new Date(u.windowFrom).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const to = new Date(u.windowTo).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return `${from} → ${to}`;
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50/60 p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-medium tabular-nums tracking-tighter text-ink">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-gray-400">
          {hint}
        </div>
      )}
    </div>
  );
}
