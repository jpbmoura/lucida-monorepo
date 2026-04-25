"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PickExamForScanDialog } from "@/features/app/provas/components/pick-exam-for-scan-dialog";

// Linha do sidebar pra "Scanner" — abre dialog em 2 etapas (turma → prova)
// e navega pra /app/provas/:id/scanner.
export function ScannerSidebarRow({
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

      <PickExamForScanDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
