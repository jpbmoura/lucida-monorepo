import { KeyRound } from "lucide-react";
import type { ApiKeyDTO } from "../data";
import { EnvironmentBadge } from "./environment-badge";
import { RevokeApiKeyButton } from "./revoke-api-key-button";

interface ApiKeysListProps {
  keys: ApiKeyDTO[];
}

/**
 * Tabela de chaves ativas da org. Ordem já vem do backend (createdAt
 * desc). Chave sem escopos aparece como "sem permissões" — útil
 * visualmente pra dev perceber antes de tentar usar.
 */
export function ApiKeysList({ keys }: ApiKeysListProps) {
  if (keys.length === 0) {
    return (
      <EmptyState
        title="Nenhuma chave ainda"
        description="Crie a primeira chave de API pra começar a integrar sistemas externos com a instituição."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
      {keys.map((k) => (
        <li
          key={k.id}
          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50/40 md:flex-row md:items-center md:gap-5"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500">
            <KeyRound className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-ink">
                {k.name}
              </span>
              <EnvironmentBadge environment={k.environment} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <code className="font-mono text-[12px]">
                lucida_{k.environment}_sk_••••••••{k.keyLastFour}
              </code>
              <span aria-hidden>·</span>
              <span>criada {formatDate(k.createdAt)}</span>
              <span aria-hidden>·</span>
              <span>
                {k.lastUsedAt
                  ? `último uso ${formatDate(k.lastUsedAt)}`
                  : "nunca usada"}
              </span>
            </div>
            {k.scopes.length === 0 ? (
              <div className="mt-1.5 text-[11px] text-amber-700">
                Sem escopos — esta chave não pode fazer nada até ser
                recriada.
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {k.scopes.map((s) => (
                  <code
                    key={s}
                    className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600"
                  >
                    {s}
                  </code>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <RevokeApiKeyButton
              keyId={k.id}
              keyName={k.name}
              keyLastFour={k.keyLastFour}
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
      <KeyRound className="size-5 text-gray-400" />
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
