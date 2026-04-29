import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { getServerSession } from "@/lib/get-server-session";
import { fetchActiveOrganization } from "@/lib/active-organization";
import { fetchOrgBilling } from "@/features/analytics/billing/data";
import { BillingModeCard } from "@/features/analytics/settings/components/billing-mode-card";
import { OrgInfoCard } from "@/features/analytics/settings/components/org-info-card";
import { OrgFiscalDataCard } from "@/features/analytics/settings/components/org-fiscal-data-card";
import { NoActiveOrg } from "@/features/analytics/dashboard/sections/no-active-org";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

export const metadata: Metadata = {
  title: "Configurações · Instituição",
};

export default async function OrgSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/organizacoes/entrar?next=/analytics/configuracoes");

  const [activeOrg, billing] = await Promise.all([
    fetchActiveOrganization(),
    fetchOrgBilling(),
  ]);

  if (!activeOrg || !billing) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <NoActiveOrg />
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-10 pb-20 md:px-10">
      <div className="mx-auto flex w-full flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-gray-100 pb-8">
          <Eyebrow>Configurações</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            Gestão da{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              instituição
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-500">
            Modo de cobrança, identidade e ajustes institucionais. Mais opções
            vão aparecendo aqui conforme a instituição cresce.
          </p>
        </header>

        <OrgInfoCard
          name={activeOrg.name}
          slug={activeOrg.slug}
          orgId={activeOrg.id}
        />

        <OrgFiscalDataCard
          organizationId={activeOrg.id}
          initial={{
            taxId: activeOrg.taxId,
            legalName: activeOrg.legalName,
            municipalRegistration: activeOrg.municipalRegistration,
            addressPostalCode: activeOrg.addressPostalCode,
            addressStreet: activeOrg.addressStreet,
            addressNumber: activeOrg.addressNumber,
            addressComplement: activeOrg.addressComplement,
            addressDistrict: activeOrg.addressDistrict,
            addressCityCode: activeOrg.addressCityCode,
            addressCityName: activeOrg.addressCityName,
            addressStateUf: activeOrg.addressStateUf,
          }}
        />

        <BillingModeCard current={billing.settings.billingMode} />

        <section className="flex items-start gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-gray-500">
            <Coins className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
              Recarga · em breve
            </div>
            <div className="text-sm leading-relaxed text-gray-600">
              A recarga de créditos institucionais via Stripe ainda está em
              produção. Por enquanto, a recarga é feita via script admin — fale
              com o suporte pra adicionar créditos.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
