import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type {
  TicketListItemDTO,
  TicketStatus,
  TicketsListResponse,
} from "../data";

export type EmailsFilter = "all" | TicketStatus;

interface Props {
  data: TicketsListResponse;
  /** Filtro ativo via search params. */
  activeFilter: EmailsFilter;
}

const BASE_PATH = "/kintal/emails";

export function EmailsList({ data, activeFilter }: Props) {
  const { items, counts } = data;

  return (
    <div className="flex flex-col gap-5">
      <FiltersTabs counts={counts} active={activeFilter} />

      {items.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">Assunto</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <Row
                  key={item.id}
                  item={item}
                  isLast={i === items.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  isLast,
}: {
  item: TicketListItemDTO;
  isLast: boolean;
}) {
  const customerLabel = item.customerName ?? item.customerEmail;
  const lastActivity = item.lastMessagePreview?.createdAt ?? item.updatedAt;
  const isNovo = item.status === "new";

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
        // Linha em destaque pra emails que ninguém respondeu ainda.
        isNovo && "bg-emerald-50/30",
      )}
    >
      <td className="px-5 py-3">
        <Link href={`${BASE_PATH}/${item.id}`} className="block min-w-0">
          <div
            className={cn(
              "truncate",
              isNovo ? "font-semibold text-ink" : "font-medium text-ink",
            )}
          >
            {customerLabel}
          </div>
          <div className="truncate text-[11px] text-gray-500">
            {item.customerEmail}
          </div>
        </Link>
      </td>
      <td className="px-5 py-3">
        <Link href={`${BASE_PATH}/${item.id}`} className="block min-w-0">
          <div
            className={cn(
              "truncate",
              isNovo ? "font-semibold text-ink" : "text-ink",
            )}
          >
            {item.subject || "(sem assunto)"}
          </div>
          {item.lastMessagePreview && (
            <div className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
              {item.lastMessagePreview.direction === "inbound" ? "↳ " : "→ "}
              {item.lastMessagePreview.textSnippet}
            </div>
          )}
        </Link>
      </td>
      <td className="px-5 py-3">
        <StatusBadge
          status={item.status}
          awaitingStaff={item.awaitingStaff}
        />
      </td>
      <td className="px-5 py-3 text-right text-xs text-gray-500">
        {formatRelativeTime(lastActivity)}
      </td>
    </tr>
  );
}

// ─── Filters ────────────────────────────────────────────────────────

function FiltersTabs({
  counts,
  active,
}: {
  counts: TicketsListResponse["counts"];
  active: EmailsFilter;
}) {
  const total = counts.new + counts.in_progress + counts.done;
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <FilterTab
        href={BASE_PATH}
        active={active === "all"}
        label="Todos"
        count={total}
      />
      <FilterTab
        href={`${BASE_PATH}?status=new`}
        active={active === "new"}
        label="Novos"
        count={counts.new}
        tone="emerald"
      />
      <FilterTab
        href={`${BASE_PATH}?status=in_progress`}
        active={active === "in_progress"}
        label="Em andamento"
        count={counts.in_progress}
        tone="amber"
      />
      <FilterTab
        href={`${BASE_PATH}?status=done`}
        active={active === "done"}
        label="Concluídos"
        count={counts.done}
      />
    </div>
  );
}

function FilterTab({
  href,
  active,
  label,
  count,
  tone,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  tone?: "emerald" | "amber";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white text-ink shadow-soft"
          : "text-gray-500 hover:text-ink",
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
          active
            ? "bg-gray-100 text-gray-700"
            : tone === "emerald" && count > 0
              ? "bg-emerald-100 text-emerald-700"
              : tone === "amber" && count > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-200 text-gray-600",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

// ─── Status badges ──────────────────────────────────────────────────

export function StatusBadge({
  status,
  awaitingStaff,
}: {
  status: TicketStatus;
  awaitingStaff: boolean;
}) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        Concluído
      </span>
    );
  }
  if (status === "new") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Novo
      </span>
    );
  }
  // in_progress — opcionalmente destaca "Aguardando você" quando última msg
  // é do cliente.
  if (awaitingStaff) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <MessageCircle className="size-3" />
        Aguardando você
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Em andamento
    </span>
  );
}

function EmptyState({ filter }: { filter: EmailsFilter }) {
  const text =
    filter === "new"
      ? "Nenhum email novo. Inbox em dia."
      : filter === "in_progress"
        ? "Nenhuma conversa em andamento."
        : filter === "done"
          ? "Nenhum email concluído ainda."
          : "Nenhum email recebido até agora.";
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
