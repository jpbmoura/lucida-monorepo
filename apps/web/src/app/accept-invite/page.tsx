import type { Metadata } from "next";
import { fetchInvitationInfo } from "@/features/accept-invite/data";
import { getServerSession } from "@/lib/get-server-session";
import { InvitationErrorCard } from "@/features/accept-invite/components/invitation-error-card";
import { EmailMismatchCard } from "@/features/accept-invite/components/email-mismatch-card";
import { AcceptExistingUserCard } from "@/features/accept-invite/components/accept-existing-user-card";
import { SignupAndAcceptCard } from "@/features/accept-invite/components/signup-and-accept-card";

export const metadata: Metadata = {
  title: "Aceitar convite",
};

interface AcceptInvitePageProps {
  searchParams: Promise<{ invitation?: string }>;
}

/**
 * Quatro caminhos possíveis, avaliados em ordem:
 *
 * 1. Sem `invitation` na URL ou id inválido → erro "link inválido".
 * 2. Invite encontrado mas não está em estado "pending" (expirado, aceito,
 *    cancelado) → erro específico.
 * 3. User logado E email da sessão ≠ email do invite → EmailMismatchCard.
 *    (Manter a regra estrita do BA pra não permitir aceite cruzado.)
 * 4. User logado com email certo → AcceptExistingUserCard (1-clique).
 * 5. User deslogado → SignupAndAcceptCard (cria conta + aceita + loga).
 */
export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const sp = await searchParams;
  const invitationId = sp.invitation?.trim();

  if (!invitationId) {
    return (
      <InvitationErrorCard
        title="Link inválido"
        message="Esse link não tem um identificador de convite. Peça um novo ao administrador da instituição."
      />
    );
  }

  const [info, session] = await Promise.all([
    fetchInvitationInfo(invitationId),
    getServerSession(),
  ]);

  if (!info) {
    return (
      <InvitationErrorCard
        title="Convite não encontrado"
        message="O link pode estar incorreto ou o convite foi excluído. Peça um novo ao administrador."
      />
    );
  }

  if (info.status !== "pending") {
    const messages: Record<
      Exclude<typeof info.status, "pending">,
      { title: string; message: string }
    > = {
      accepted: {
        title: "Convite já aceito",
        message:
          "Este convite já foi aceito antes. Entre com sua conta para acessar o painel.",
      },
      canceled: {
        title: "Convite cancelado",
        message:
          "O administrador cancelou este convite. Se ainda deseja entrar, peça um novo.",
      },
      rejected: {
        title: "Convite recusado",
        message:
          "Este convite foi recusado. Se foi engano, peça um novo ao administrador.",
      },
    };
    const copy = messages[info.status];
    return <InvitationErrorCard title={copy.title} message={copy.message} />;
  }

  if (new Date(info.expiresAt).getTime() <= Date.now()) {
    return (
      <InvitationErrorCard
        title="Convite expirado"
        message="Este convite passou do prazo. Peça um novo ao administrador da instituição."
      />
    );
  }

  if (session) {
    if (session.user.email.toLowerCase() !== info.email.toLowerCase()) {
      return (
        <EmailMismatchCard
          inviteEmail={info.email}
          currentEmail={session.user.email}
        />
      );
    }
    return (
      <AcceptExistingUserCard
        invitationId={info.id}
        organizationName={info.organizationName}
        inviterName={info.inviterName}
        userName={session.user.name ?? "professor"}
      />
    );
  }

  return (
    <SignupAndAcceptCard
      invitationId={info.id}
      email={info.email}
      organizationName={info.organizationName}
      inviterName={info.inviterName}
    />
  );
}
