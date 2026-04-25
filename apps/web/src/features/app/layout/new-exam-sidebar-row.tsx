"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewExamDialog } from "@/features/app/provas/components/new-exam-dialog";

// Linha do sidebar pra "Nova prova" — visualmente igual ao NavRow normal,
// mas é um botão que abre o dialog em vez de navegar.
export function NewExamSidebarRow({
  label,
  Icon,
  disabled,
}: {
  label: string;
  Icon: LucideIcon;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
          "text-gray-600 hover:bg-gray-50 hover:text-ink",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={2} />
        <span className="flex-1 truncate text-left">{label}</span>
      </button>

      <NewExamDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
