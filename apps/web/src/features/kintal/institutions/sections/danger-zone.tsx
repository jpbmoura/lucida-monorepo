"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  archiveInstitutionAction,
  unarchiveInstitutionAction,
} from "../data";
import type { KintalInstitutionDetail } from "../types";

export function DangerZone({
  institution,
}: {
  institution: KintalInstitutionDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const archived = institution.archivedAt !== null;

  function handleArchive() {
    if (
      !window.confirm(
        `Arquivar a instituição "${institution.name}"? Membros, wallets e ledger ficam preservados; a org some das listagens default. Reversível.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await archiveInstitutionAction(institution.id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      const res = await unarchiveInstitutionAction(institution.id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-red-100 bg-red-50/30 p-6">
      <header className="pb-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-red-500">
          Zona de risco
        </div>
        <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">
          {archived ? "Instituição arquivada" : "Arquivar instituição"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {archived
            ? "A instituição está oculta das listagens default. Reverter restaura tudo no estado anterior."
            : "Soft-delete. Membros, wallets e ledger ficam intactos — só some das listagens. Pra apagar de verdade, contate o time de DBA."}
        </p>
      </header>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {archived ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleUnarchive}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Restaurando...
            </>
          ) : (
            <>
              <ArchiveRestore className="size-4" />
              Restaurar
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleArchive}
          disabled={isPending}
          className="border-red-200 text-red-700 hover:bg-red-100"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Arquivando...
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Arquivar instituição
            </>
          )}
        </Button>
      )}
    </section>
  );
}
