import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Badge que mostra qual escopo a chave precisa ter pra chamar um
 * endpoint. Cadeado reforça visualmente "precisa de permissão
 * explícita". Formato é o identificador cru do escopo (`classes:read`).
 */
export function ScopeBadge({
  scope,
  className,
}: {
  scope: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700",
        className,
      )}
    >
      <Lock className="size-3" />
      {scope}
    </span>
  );
}
