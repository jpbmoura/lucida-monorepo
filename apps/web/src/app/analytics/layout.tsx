import { redirect } from "next/navigation";
import { AnalyticsSidebar } from "@/features/analytics/layout/sidebar";
import { AnalyticsTopbar } from "@/features/analytics/layout/topbar";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import { fetchActiveOrganization } from "@/lib/active-organization";
import { fetchAssistantState } from "@/lib/assistant-state";

/**
 * Shell do ambiente de instituições. `theme-analytics` no wrapper aplica a
 * paleta roxa pros componentes neutros (inputs, focus ring, ::selection) sem
 * tocar nos tokens `--color-brand-*`. Sidebar/topbar usam o logo Analytics e
 * os gradientes roxos diretamente.
 */
export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/organizacoes/entrar?next=/analytics");
  }

  // Auxiliares NÃO acessam o /analytics — redireciona pro /app, que se
  // encarrega de mandar pro seletor caso ainda não tenha cookie de target.
  const assistant = await fetchAssistantState().catch(() => null);
  if (assistant && assistant.availableTeachers > 0) {
    redirect("/app");
  }

  const display = buildDisplayUser({
    name: session.user.name,
    email: session.user.email,
  });

  // Busca da org ativa tolera falha — se der 401/500, o shell ainda
  // renderiza e a page cuida do empty-state. Badge fica oculto.
  const activeOrg = await fetchActiveOrganization().catch(() => null);

  // Gate de autorização: /analytics é só pra admin da instituição (owner
  // ou admin). Member comum que caiu aqui por URL direta volta pro /app.
  // Sem org ativa a page cuida (`NoActiveOrg` state), então não redirecionamos
  // — dá uma mensagem mais informativa que um silent redirect.
  if (activeOrg && activeOrg.myRole === "member") {
    redirect("/app");
  }

  return (
    <div className="theme-analytics flex min-h-screen bg-white">
      <AnalyticsSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AnalyticsTopbar
          userName={display.name}
          userEmail={display.email}
          initials={display.initials}
          orgName={activeOrg?.name ?? null}
        />
        {children}
      </div>
    </div>
  );
}
