import { Building2 } from "lucide-react";

interface OrganizationBadgeProps {
  name: string;
}

/**
 * Mostra qual organização está ativa na sessão. MVP: display-only. Quando
 * um user puder ser admin de múltiplas orgs, vira dropdown com troca de
 * `setActiveOrganization`.
 */
export function OrganizationBadge({ name }: OrganizationBadgeProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-pill border border-gray-200 bg-white px-3 py-1.5"
      title={`Organização ativa: ${name}`}
    >
      <span className="grid size-5 place-items-center rounded-full bg-analytics-primary/10 text-analytics-primary">
        <Building2 className="size-3" />
      </span>
      <span className="max-w-[200px] truncate text-[12px] font-medium text-ink">
        {name}
      </span>
    </div>
  );
}
