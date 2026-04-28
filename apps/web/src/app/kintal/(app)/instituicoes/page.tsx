import type { Metadata } from "next";
import { fetchInstitutions } from "@/features/kintal/institutions/data";
import type { ArchivedFilter } from "@/features/kintal/institutions/types";
import { InstituicoesPageHeader } from "@/features/kintal/institutions/sections/page-header";
import { InstitutionsFilters } from "@/features/kintal/institutions/components/institutions-filters";
import { InstitutionsList } from "@/features/kintal/institutions/sections/institutions-list";

export const metadata: Metadata = {
  title: "Instituições",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    archived?: string;
  }>;
}

const ARCHIVED_VALUES: ArchivedFilter[] = ["active", "all", "archived"];

function parseArchived(raw: string | undefined): ArchivedFilter {
  if (raw && (ARCHIVED_VALUES as string[]).includes(raw)) {
    return raw as ArchivedFilter;
  }
  return "active";
}

export default async function KintalInstituicoesPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const archived = parseArchived(sp.archived);

  const items = await fetchInstitutions({ q, archived });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <InstituicoesPageHeader total={items.length} />

      <div className="mt-8">
        <InstitutionsFilters q={q} archived={archived} />
      </div>

      <div className="mt-8">
        <InstitutionsList items={items} />
      </div>
    </div>
  );
}
