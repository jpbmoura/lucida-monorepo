"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateInstitutionDialog } from "../components/create-institution-dialog";

interface InstituicoesPageHeaderProps {
  total: number;
}

export function InstituicoesPageHeader({
  total,
}: InstituicoesPageHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Operações
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          Instituições da{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            Lucida
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Cria, ajusta plano e abre a página de cada instituição. Cortesia
          (ilimitado) é definida aqui — não passa pelo Stripe.
        </p>
      </div>

      <div className="flex flex-col items-end gap-3">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
          Nova instituição
        </Button>
        <div className="text-right">
          <div className="text-3xl font-medium tracking-tighter tabular-nums text-ink">
            {total.toLocaleString("pt-BR")}
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">
            {total === 1 ? "resultado" : "resultados"}
          </div>
        </div>
      </div>

      <CreateInstitutionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
