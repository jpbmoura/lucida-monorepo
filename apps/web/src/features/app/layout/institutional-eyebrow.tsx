import Link from "next/link";
import { Building2 } from "lucide-react";

interface InstitutionalEyebrowProps {
  orgName: string;
}

/**
 * Eyebrow discreto mostrado no topbar do /app quando o professor é member
 * de uma organização. Clicar leva pro /analytics — atalho útil caso o
 * user também seja admin. Pra professores que NÃO são admin (nenhum
 * member de org com role=owner/admin), o middleware do /analytics vai
 * bloquear, mas isso é raro e aceitável no MVP.
 */
export function InstitutionalEyebrow({ orgName }: InstitutionalEyebrowProps) {
  return (
    <Link
      href="/analytics"
      title="Você faz parte desta instituição"
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
    >
      <Building2 className="size-3" />
      <span className="max-w-[220px] truncate">Via {orgName}</span>
    </Link>
  );
}
