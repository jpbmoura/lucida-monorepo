import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import { fetchActiveOrganization } from "@/lib/active-organization";
import { InstitutionalHelpPage } from "@/features/analytics/help/institutional-help-page";

export const metadata: Metadata = {
  title: "Ajuda e suporte · Instituição",
};

export default async function InstitutionalAjudaRoute() {
  const session = await getServerSession();
  if (!session) redirect("/organizacoes/entrar?next=/analytics/ajuda");

  const display = buildDisplayUser({
    name: session.user.name,
    email: session.user.email,
  });
  // A org pode ser null se o user caiu aqui sem setActive — o form continua
  // funcionando (categoria + subject + mensagem), só perde o prefill do
  // WhatsApp com o nome da org. Não vale a pena redirect pra /sign-in aqui.
  const activeOrg = await fetchActiveOrganization().catch(() => null);

  return (
    <InstitutionalHelpPage
      userName={display.name}
      userEmail={display.email}
      orgName={activeOrg?.name ?? null}
    />
  );
}
