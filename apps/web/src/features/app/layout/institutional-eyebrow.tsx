import Link from "next/link";
import { Building2 } from "lucide-react";

interface InstitutionalEyebrowProps {
  orgName: string;
  /**
   * Quando true, vira link clicável pro `/analytics` (atalho do admin).
   * Quando false, é só um label decorativo — o painel da instituição é
   * restrito a owner/admin, e renderizar o Link aqui faria o Next
   * pre-fetchar `/analytics` que retornaria 403 (NOT_ORG_ADMIN) pra
   * member comum, poluindo logs.
   */
  isAdmin: boolean;
}

/**
 * Eyebrow discreto mostrado no topbar do /app quando o professor é member
 * de uma organização. Vira link pra `/analytics` apenas quando o user é
 * admin/owner — pra members comuns é só um indicador visual.
 */
export function InstitutionalEyebrow({
  orgName,
  isAdmin,
}: InstitutionalEyebrowProps) {
  const baseClasses =
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium text-gray-500";

  if (!isAdmin) {
    return (
      <span
        title="Você faz parte desta instituição"
        className={baseClasses}
      >
        <Building2 className="size-3" />
        <span className="max-w-[220px] truncate">Via {orgName}</span>
      </span>
    );
  }

  return (
    <Link
      href="/analytics"
      title="Abrir painel da instituição"
      className={`${baseClasses} transition-colors hover:bg-gray-100 hover:text-ink`}
    >
      <Building2 className="size-3" />
      <span className="max-w-[220px] truncate">Via {orgName}</span>
    </Link>
  );
}
