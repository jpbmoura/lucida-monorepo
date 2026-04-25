import { Building2 } from "lucide-react";

interface OrgInfoCardProps {
  name: string;
  slug: string;
  orgId: string;
}

/**
 * Card read-only com identidade da org. Edição de nome/slug fica pra
 * iteração posterior (envolve invalidar URLs públicas se criarmos).
 */
export function OrgInfoCard({ name, slug, orgId }: OrgInfoCardProps) {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
        <Building2 className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
          Instituição
        </div>
        <div className="text-lg font-medium text-ink">{name}</div>
        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          <span>slug:</span>
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
            {slug}
          </code>
          <span aria-hidden>·</span>
          <span>id:</span>
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
            {orgId}
          </code>
        </div>
      </div>
    </section>
  );
}
