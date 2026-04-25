import {
  Activity,
  Calendar,
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FakeItem {
  title: string;
  meta: string;
  value?: string;
  tone: "blue" | "dark" | "muted";
  icon: "check" | "users" | "file" | "report" | "calendar";
}

const ICON_MAP = {
  check: CheckCircle2,
  users: Users,
  file: FileText,
  report: Activity,
  calendar: Calendar,
};

const PREVIEW: FakeItem[] = [
  {
    title: "Prova de Álgebra corrigida",
    meta: "9º A · há 12 min",
    value: "7,8",
    tone: "blue",
    icon: "check",
  },
  {
    title: "23 alunos submeteram",
    meta: "Geometria P3 · há 1h",
    tone: "muted",
    icon: "users",
  },
  {
    title: "Nova prova gerada pela Lulu",
    meta: "Funções · há 3h",
    tone: "dark",
    icon: "file",
  },
  {
    title: "Relatório do bimestre pronto",
    meta: "7º B · ontem",
    tone: "muted",
    icon: "report",
  },
];

export function ActivityList() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6">
        <h2 className="text-xl font-medium tracking-tight text-ink">
          Atividade{" "}
          <span className="font-serif text-[1.1em] italic text-gray-500">
            recente
          </span>
        </h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Feed das últimas ações nas suas turmas
        </p>
      </div>

      <ul className="flex flex-col blur-[3px]" aria-hidden>
        {PREVIEW.map((item, i) => {
          const Icon = ICON_MAP[item.icon];
          const toneClasses = {
            blue: "bg-brand-primary/10 text-brand-primary",
            dark: "bg-ink text-white",
            muted: "bg-gray-50 text-gray-600",
          }[item.tone];
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3.5 py-3.5",
                i < PREVIEW.length - 1 && "border-b border-gray-100",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[10px]",
                  toneClasses,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {item.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {item.meta}
                </div>
              </div>
              {item.value && (
                <span className="text-sm font-medium tabular-nums text-ink">
                  {item.value}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <ComingSoonOverlay />
    </div>
  );
}

function ComingSoonOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white/90 px-6 py-5 text-center shadow-soft">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-brand-primary">
          <Sparkles className="size-3" />
          Em breve
        </span>
        <p className="max-w-[220px] text-[13px] leading-snug text-ink">
          Um feed em tempo real do que rola nas suas turmas.
        </p>
      </div>
    </div>
  );
}
