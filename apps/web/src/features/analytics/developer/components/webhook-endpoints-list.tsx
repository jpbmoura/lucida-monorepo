import { Webhook } from "lucide-react";
import type { WebhookEndpointDTO, WebhookEvent } from "../data";
import { EnvironmentBadge } from "./environment-badge";
import { EditWebhookEndpointButton } from "./edit-webhook-endpoint-button";
import { RotateWebhookSecretButton } from "./rotate-webhook-secret-button";
import { DeleteWebhookEndpointButton } from "./delete-webhook-endpoint-button";

interface WebhookEndpointsListProps {
  endpoints: WebhookEndpointDTO[];
  allEvents: WebhookEvent[];
}

export function WebhookEndpointsList({
  endpoints,
  allEvents,
}: WebhookEndpointsListProps) {
  if (endpoints.length === 0) {
    return (
      <EmptyState
        title="Nenhum endpoint cadastrado"
        description="Cadastre um endpoint pra receber eventos automaticamente. Os disparos serão ativados em iteração futura — você já pode preparar o endpoint e o signing secret agora."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
      {endpoints.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50/40"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500">
              <Webhook className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <code className="truncate font-mono text-sm text-ink">
                  {e.url}
                </code>
                <EnvironmentBadge environment={e.environment} />
                {!e.enabled && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">
                    Pausado
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                criado {formatDate(e.createdAt)}
                {e.updatedAt !== e.createdAt && (
                  <>
                    {" · "}
                    atualizado {formatDate(e.updatedAt)}
                  </>
                )}
              </div>
              {e.events.length === 0 ? (
                <div className="mt-1.5 text-[11px] text-amber-700">
                  Sem eventos inscritos — este endpoint não vai receber
                  nada.
                </div>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {e.events.map((ev) => (
                    <code
                      key={ev}
                      className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600"
                    >
                      {ev}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t border-gray-50 pt-3 md:ml-14 md:border-t-0 md:pt-0">
            <EditWebhookEndpointButton endpoint={e} allEvents={allEvents} />
            <RotateWebhookSecretButton
              endpointId={e.id}
              endpointUrl={e.url}
            />
            <DeleteWebhookEndpointButton
              endpointId={e.id}
              endpointUrl={e.url}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-8">
      <Webhook className="size-5 text-gray-400" />
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="max-w-xl text-xs text-gray-500">{description}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const then = new Date(iso);
  const now = Date.now();
  const diff = now - then.getTime();
  const day = 1000 * 60 * 60 * 24;
  if (diff < day) return "hoje";
  if (diff < 2 * day) return "ontem";
  if (diff < 30 * day) return `há ${Math.floor(diff / day)} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(then);
}
