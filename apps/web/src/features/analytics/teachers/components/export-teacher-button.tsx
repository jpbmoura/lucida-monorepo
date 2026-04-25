"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportTeacherButtonProps {
  teacherId: string;
  teacherName: string;
}

/**
 * Dispara download do ZIP com os dados do professor. Precisa ser client
 * porque:
 *   - Fetch precisa receber o blob e criar `<a download>` dinâmico.
 *   - Não dá pra server action porque retornar `Uint8Array` pra browser
 *     não é trivial — o pattern mais confiável é fetch direto + blob.
 *
 * Next rewrite do `/v1/*` proxia pra api, então o request vai same-origin
 * e o cookie de sessão segue junto.
 */
export function ExportTeacherButton({
  teacherId,
  teacherName,
}: ExportTeacherButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        `/v1/analytics/teachers/${encodeURIComponent(teacherId)}/export`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        // Controller devolve JSON em erro, ZIP em sucesso. Tenta parsar.
        let message = "Não foi possível exportar.";
        try {
          const body = await res.json();
          message = body?.message ?? message;
        } catch {
          // ignore — usa mensagem default
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      // Extrai filename do Content-Disposition (fallback pra genérico).
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] ?? `lucida-${slug(teacherName)}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {pending ? "Preparando..." : "Exportar dados"}
      </Button>
      {error && (
        <span className="text-[11px] text-red-600">{error}</span>
      )}
    </div>
  );
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
