"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { RevokeMemberDialog } from "./revoke-member-dialog";

interface RevokeMemberButtonProps {
  memberName: string;
  memberEmail: string;
}

/**
 * Abre `RevokeMemberDialog` pra confirmar e, ao aceitar, chama
 * `authClient.organization.removeMember` com `memberIdOrEmail` = email.
 * Passamos email (não userId) porque o BA na `member` collection guarda um
 * `_id` próprio diferente do `user._id`, e o memberId não é exposto no
 * endpoint de listagem que usamos — email é único e resolve sozinho.
 */
export function RevokeMemberButton({
  memberName,
  memberEmail,
}: RevokeMemberButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleConfirm(): Promise<{ ok: boolean; error?: string }> {
    const res = await authClient.organization.removeMember({
      memberIdOrEmail: memberEmail,
    });
    if (res.error) {
      return {
        ok: false,
        error: res.error.message ?? "Não foi possível revogar.",
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
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <UserMinus className="size-3.5" />
        Revogar
      </button>
      <RevokeMemberDialog
        open={open}
        onOpenChange={setOpen}
        memberName={memberName}
        memberEmail={memberEmail}
        onConfirm={handleConfirm}
      />
    </>
  );
}
