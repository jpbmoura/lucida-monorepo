"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { CancelInvitationDialog } from "./cancel-invitation-dialog";

interface CancelInvitationButtonProps {
  invitationId: string;
  email: string;
}

/**
 * Cancela um convite pendente. BA marca a invitation como `canceled` — o
 * link do email deixa de funcionar. Pra reconvidar, owner dispara um novo
 * invite pelo dialog de "Convidar professor".
 */
export function CancelInvitationButton({
  invitationId,
  email,
}: CancelInvitationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleConfirm(): Promise<{ ok: boolean; error?: string }> {
    const res = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (res.error) {
      return {
        ok: false,
        error: res.error.message ?? "Não foi possível cancelar.",
      };
    }
    router.refresh();
    return { ok: true };
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <X className="size-3.5" />
        Cancelar
      </button>
      <CancelInvitationDialog
        open={open}
        onOpenChange={setOpen}
        email={email}
        onConfirm={handleConfirm}
      />
    </>
  );
}
