import { PeriodFilter } from "../components/period-filter";
import { PERIOD_LABELS, type PeriodScope } from "../types";

interface PageHeaderProps {
  firstName: string;
  period: PeriodScope;
}

// Mesmo shape do /app e /analytics: eyebrow com pulse-dot + data,
// headline grande com destaque em italic serif, subtítulo e PeriodFilter
// à direita. O destaque fica em `text-gray-500` pra manter a paleta
// grayscale do Kintal — o papel do italic aqui é tipográfico, não de cor.
export function PageHeader({ firstName, period }: PageHeaderProps) {
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(now);

  const windowLabel = PERIOD_LABELS[period].toLowerCase();

  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Backoffice · {capitalize(formattedDate)}
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          {greeting}, {firstName} —{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            visão geral
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Receita, usuários e assinaturas nos últimos {windowLabel}.
        </p>
      </div>

      <PeriodFilter active={period} />
    </div>
  );
}

function getGreeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
