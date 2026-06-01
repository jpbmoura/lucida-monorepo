import { redirect } from "next/navigation";
import { Sidebar } from "@/features/app/layout/sidebar";
import { Topbar } from "@/features/app/layout/topbar";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import {
  fetchActiveOrganization,
  isOrgPayingForUser,
} from "@/lib/active-organization";
import { fetchImpersonateState } from "@/lib/impersonate-state";
import { fetchAssistantState } from "@/lib/assistant-state";
import {
  fetchBalance,
  fetchCurrentSubscription,
} from "@/features/app/billing/data";
import { LowBalanceAlert } from "@/features/app/billing/components/low-balance-alert";
import { ImpersonateBanner } from "@/features/analytics/impersonate/components/impersonate-banner";
import { AssistantBanner } from "@/features/auth/assistant/assistant-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const effective = await getEffectiveUser();
  if (!effective) {
    redirect("/sign-in?next=/app");
  }

  const display = buildDisplayUser({
    name: effective.name,
    email: effective.email,
  });

  // Antes de tudo: se o user é auxiliar (tem vínculos teacher_assistants
  // ativos) mas NÃO escolheu nada ainda (nem professor, nem "própria
  // conta"), redireciona pro seletor. Mesma chamada serve pra montar o
  // banner depois. `selfMode` significa que ele já escolheu a própria
  // conta no /auxiliar/escolher — deixa passar.
  const assistant = await fetchAssistantState().catch(() => null);
  if (
    assistant &&
    assistant.availableTeachers > 0 &&
    !assistant.activeTarget &&
    !assistant.selfMode
  ) {
    redirect("/auxiliar/escolher");
  }

  // Billing + organização ativa + estado de impersonate carregam aqui pra
  // alimentar topbar + alert + banner. Tolera falhas — qualquer endpoint
  // que caia não deve quebrar a UI.
  const [balance, subscription, activeOrg, impersonate, session] =
    await Promise.all([
      fetchBalance().catch(() => null),
      fetchCurrentSubscription().catch(() => null),
      fetchActiveOrganization().catch(() => null),
      fetchImpersonateState().catch(() => null),
      getServerSession().catch(() => null),
    ]);

  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "past_due";
  const orgPays = isOrgPayingForUser(activeOrg?.billingMode);
  // Staff vem da sessão real (não do effective user) — assim o atalho
  // "Kintal" persiste mesmo quando o staff está impersonando um professor.
  const isStaff = session?.user.role === "staff";

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar hasActiveSubscription={hasActiveSubscription} />
      <div className="flex min-w-0 flex-1 flex-col">
        {assistant?.activeTarget && (
          <AssistantBanner
            teacherName={assistant.activeTarget.teacherName}
            teacherEmail={assistant.activeTarget.teacherEmail}
            assistantName={assistant.activeTarget.assistantName}
            assistantEmail={assistant.activeTarget.assistantEmail}
          />
        )}
        {!assistant?.activeTarget &&
          impersonate?.isImpersonating &&
          impersonate.actingAs &&
          impersonate.mode && (
            <ImpersonateBanner
              actingAsName={impersonate.actingAs.name}
              actingAsEmail={impersonate.actingAs.email}
              mode={impersonate.mode}
              targetUserId={impersonate.actingAs.id}
            />
          )}
        <Topbar
          userName={display.name}
          userEmail={display.email}
          initials={display.initials}
          initialBalance={balance?.total ?? null}
          orgName={activeOrg?.name ?? null}
          isOrgAdmin={
            activeOrg?.myRole === "owner" || activeOrg?.myRole === "admin"
          }
          hideBalance={orgPays}
          isAssistant={(assistant?.availableTeachers ?? 0) > 0}
          isStaff={isStaff}
          hasActiveSubscription={hasActiveSubscription}
        />
        {/* LowBalanceAlert é sobre saldo pessoal — some quando a instituição
            paga pela ação (pool/pay_per_use). O saldo pessoal fica congelado
            e alertar sobre ele só confundiria. */}
        {!orgPays && balance && (
          <LowBalanceAlert balance={balance} subscription={subscription} />
        )}
        {children}
      </div>
    </div>
  );
}
