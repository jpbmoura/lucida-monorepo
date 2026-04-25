import Link from "next/link";
import { UserPlus, ArrowRight } from "lucide-react";

type Variant = "no-teachers" | "no-activity";

interface EmptyStateProps {
  variant: Variant;
  orgName: string;
}

/**
 * Estado "ainda não rolou nada" do dashboard. Dois contextos:
 *
 *  - `no-teachers`: só o owner é member. Chama pra convidar professor.
 *  - `no-activity`: tem professores mas ainda não criaram provas. Chama
 *    pra pedir que comecem a usar o Exam.
 *
 * Ambos são estados legítimos de instituição nova — não devem parecer bug.
 */
export function EmptyState({ variant, orgName }: EmptyStateProps) {
  const copy = COPY[variant];

  return (
    <section className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-analytics-primary/30 bg-analytics-primary/5 p-8 md:flex-row md:items-center md:justify-between md:p-10">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-analytics-primary shadow-soft">
          <UserPlus className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-medium tracking-tight text-ink md:text-2xl">
            {copy.title}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600">
            {copy.body(orgName)}
          </p>
        </div>
      </div>

      <Link
        href={copy.ctaHref}
        aria-disabled={copy.ctaDisabled}
        className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-analytics-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-analytics-dark-01 aria-disabled:pointer-events-none aria-disabled:opacity-60"
      >
        {copy.ctaLabel}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

const COPY: Record<
  Variant,
  {
    title: string;
    body: (orgName: string) => string;
    ctaLabel: string;
    ctaHref: string;
    ctaDisabled?: boolean;
  }
> = {
  "no-teachers": {
    title: "Vamos preencher a instituição",
    body: (orgName) =>
      `${orgName} ainda não tem professores além do administrador. Assim que você convidar o primeiro docente, os dados vão começar a aparecer aqui.`,
    ctaLabel: "Convidar professor",
    ctaHref: "#",
    ctaDisabled: true,
  },
  "no-activity": {
    title: "Ainda sem provas aplicadas",
    body: (orgName) =>
      `Os docentes de ${orgName} ainda não criaram provas no Exam. Esse painel agrega os dados automaticamente — assim que a primeira prova for aplicada, tudo aparece aqui.`,
    ctaLabel: "Ver como criar uma prova",
    ctaHref: "/app",
  },
};
