import type { Metadata } from "next";
import { fetchOrgAdminCampaigns } from "@/features/notifications/data";
import { SendForm } from "@/features/notifications/components/send-form";
import { CampaignsHistory } from "@/features/notifications/components/campaigns-history";

export const metadata: Metadata = {
  title: "Enviar notificação",
};

export default async function AnalyticsSendNotificacaoPage() {
  const campaigns = await fetchOrgAdminCampaigns();

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <header className="mb-10 border-b border-gray-100 pb-8">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Comunicação interna
        </div>
        <h1 className="text-3xl font-medium leading-[1.05] tracking-tighter text-ink md:text-4xl">
          Enviar{" "}
          <span className="font-serif font-normal italic text-analytics-primary">
            notificações
          </span>{" "}
          aos professores
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
          Avisos pra todos os membros da sua instituição. Aparecem no sininho da
          topbar e na inbox.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
        <SendForm mode={{ kind: "org_admin" }} />

        <CampaignsHistory campaigns={campaigns} mode="org_admin" />
      </div>
    </div>
  );
}
