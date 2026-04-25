"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InviteTeacherDialog } from "./invite-teacher-dialog";

/**
 * Trigger + Dialog combinados. O botão é o único jeito de mutação da lista
 * fora das actions inline (revogar/cancelar), então fica destacado no topo
 * da página /analytics/professores.
 */
export function InviteTeacherButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        Convidar professor
      </Button>
      <InviteTeacherDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
