import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// Aviso de funcionalidade em testes (módulo Aulas) + canal pra reportar bugs.
export function BetaNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px] text-amber-900",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        O módulo de <span className="font-medium">Aulas</span> ainda está em
        testes. Encontrou algum problema? Conte pra gente em{" "}
        <Link
          href="/app/ajuda"
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Ajuda e suporte
        </Link>
        .
      </p>
    </div>
  );
}
