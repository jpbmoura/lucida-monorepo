import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import type { KintalInstitutionDetail } from "../types";

export function InstitutionDetailHeader({
  institution,
}: {
  institution: KintalInstitutionDetail;
}) {
  const archived = institution.archivedAt !== null;
  const created = new Date(institution.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border-b border-gray-100 pb-6">
      <Link
        href="/kintal/instituicoes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Voltar para Instituições
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ink to-gray-600 text-white">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-3xl font-medium tracking-tighter text-ink">
                {institution.name}
              </h1>
              {archived && (
                <span className="shrink-0 rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Arquivada
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {institution.slug ? `/${institution.slug}` : "—"} · criada em{" "}
              {created}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
