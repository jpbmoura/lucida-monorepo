"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StaffMember } from "@/features/kintal/acessos/types";
import { CardFormDialog } from "./card-form-dialog";

interface CreateCardButtonProps {
  staff: StaffMember[];
}

// Botão primário do header. Abre o dialog em modo create. Reusa o
// CardFormDialog (que cobre create + edit no mesmo componente).
export function CreateCardButton({ staff }: CreateCardButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        className="shrink-0 hover:!bg-gray-800"
      >
        <Plus />
        Novo card
      </Button>
      <CardFormDialog open={open} onOpenChange={setOpen} staff={staff} />
    </>
  );
}
