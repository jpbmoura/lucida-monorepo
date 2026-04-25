import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Webhook } from "lucide-react";
import { getServerSession } from "@/lib/get-server-session";
import { fetchActiveOrganization } from "@/lib/active-organization";
import {
  fetchApiKeys,
  fetchDeveloperMetadata,
  fetchWebhookEndpoints,
} from "@/features/analytics/developer/data";
import { ApiKeysList } from "@/features/analytics/developer/components/api-keys-list";
import { CreateApiKeyButton } from "@/features/analytics/developer/components/create-api-key-button";
import { WebhookEndpointsList } from "@/features/analytics/developer/components/webhook-endpoints-list";
import { CreateWebhookEndpointButton } from "@/features/analytics/developer/components/create-webhook-endpoint-button";
import { NoActiveOrg } from "@/features/analytics/dashboard/sections/no-active-org";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

export const metadata: Metadata = {
  title: "Desenvolvedores · Instituição",
};

export default async function DeveloperPage() {
  const session = await getServerSession();
  if (!session)
    redirect("/organizacoes/entrar?next=/analytics/desenvolvedores");

  const activeOrg = await fetchActiveOrganization();
  if (!activeOrg) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <NoActiveOrg />
      </main>
    );
  }

  // Carrega keys, endpoints e metadata em paralelo. Metadata é estática
  // (enum de scopes/events) — um fetch só por render, passa pra dialogs
  // como prop e evita loading spinner em cada abertura.
  const [keys, endpoints, metadataRaw] = await Promise.all([
    fetchApiKeys(),
    fetchWebhookEndpoints(),
    fetchDeveloperMetadata(),
  ]);

  if (!keys || !endpoints) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <NoActiveOrg />
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-10 pb-20 md:px-10">
      <div className="mx-auto flex w-full flex-col gap-12">
        <header className="flex flex-col gap-3 border-b border-gray-100 pb-8">
          <Eyebrow>Desenvolvedores</Eyebrow>
          <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
            Chaves,{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              webhooks
            </span>{" "}
            e integrações
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
            Prepare o terreno pra integrar a instituição com sistemas externos.
            As rotas públicas e os disparos de webhook serão ligados em iteração
            futura — hoje você já pode criar as chaves e cadastrar endpoints pra
            seu time começar a preparar a integração.
          </p>
        </header>

        <section className="flex flex-col gap-5">
          <SectionHeader
            icon={<KeyRound className="size-4" />}
            title="Chaves de API"
            description="Geradas uma única vez. Guarde em segredo — o backend só armazena o hash."
            action={<CreateApiKeyButton allScopes={metadataRaw.scopes} />}
          />
          <ApiKeysList keys={keys} />
        </section>

        <section className="flex flex-col gap-5">
          <SectionHeader
            icon={<Webhook className="size-4" />}
            title="Endpoints de webhook"
            description="URLs que vão receber eventos da instituição. Cada endpoint tem seu próprio signing secret pra verificar autenticidade."
            action={
              <CreateWebhookEndpointButton allEvents={metadataRaw.events} />
            }
          />
          <WebhookEndpointsList
            endpoints={endpoints}
            allEvents={metadataRaw.events}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Em breve
          </div>
          <div className="text-sm leading-relaxed text-gray-600">
            Próximos passos previstos: rotas públicas em{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-gray-700">
              /v1/public/*
            </code>{" "}
            autenticadas via Bearer, disparo real dos webhooks com retry e
            assinatura HMAC, histórico de entregas e uso por chave.
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
          <span className="grid size-7 place-items-center rounded-lg bg-gray-50 text-gray-500">
            {icon}
          </span>
          {title}
        </div>
        <p className="max-w-xl text-xs text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
