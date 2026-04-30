import Link from "next/link";
import { Mail, FileText, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type {
  TicketKind,
  TicketListItemDTO,
  TicketStatus,
  TicketsListResponse,
} from "../data";

type SupportFilter = "all" | TicketStatus;
type InboxFilter = "all" | "unread";

interface Props {
  data: TicketsListResponse;
  /** Determina rotulação, filtros disponíveis e link de detail. */
  kind: TicketKind;
  /** Filtro ativo via search params. Tipo depende do `kind`. */
  activeFilter: SupportFilter | InboxFilter;
}

const SUPPORT_BASE_PATH = "/kintal/tickets";
const INBOX_BASE_PATH = "/kintal/inbox";

export function TicketsList({ data, kind, activeFilter }: Props) {
  const { items, counts } = data;
  const basePath = kind === "support" ? SUPPORT_BASE_PATH : INBOX_BASE_PATH;
  const isInbox = kind === "general";

  return (
    <div className="flex flex-col gap-5">
      {isInbox ? (
        <InboxFiltersTabs counts={counts} active={activeFilter as InboxFilter} />
      ) : (
        <SupportFiltersTabs
          counts={counts}
          active={activeFilter as SupportFilter}
        />
      )}

      {items.length === 0 ? (
        <EmptyState kind={kind} filter={activeFilter} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">
                  {isInbox ? "Mensagem" : "Assunto"}
                </th>
                <th className="hidden px-5 py-2.5 md:table-cell">Origem</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <Row
                  key={item.id}
                  item={item}
                  basePath={basePath}
                  isInbox={isInbox}
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
  basePath,
  isInbox,
  isLast,
}: {
  item: TicketListItemDTO;
  basePath: string;
  isInbox: boolean;
  isLast: boolean;
}) {
  const customerLabel = item.customerName ?? item.customerEmail;
  const lastActivity = item.lastMessagePreview?.createdAt ?? item.updatedAt;
  // Em inbox: linha de não-lido fica em negrito (estilo Gmail).
  const isUnread = isInbox && !item.readByMe;

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
        isUnread && "bg-brand-primary/[0.03]",
      )}
    >
      <td className="px-5 py-3">
        <Link href={`${basePath}/${item.id}`} className="block min-w-0">
          <div
            className={cn(
              "truncate",
              isUnread ? "font-semibold text-ink" : "font-medium text-ink",
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
        <Link href={`${basePath}/${item.id}`} className="block min-w-0">
          <div
            className={cn(
              "truncate",
              isUnread ? "font-semibold text-ink" : "text-ink",
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
      <td className="hidden px-5 py-3 text-[11px] md:table-cell">
        <OriginBadge origin={item.origin} />
      </td>
      <td className="px-5 py-3">
        {isInbox ? (
          <InboxStatusBadge readByMe={item.readByMe} />
        ) : (
          <SupportStatusBadge
            status={item.status}
            awaitingStaff={item.awaitingStaff}
          />
        )}
      </td>
      <td className="px-5 py-3 text-right text-xs text-gray-500">
        {formatRelativeTime(lastActivity)}
      </td>
    </tr>
  );
}

// ─── Filters ────────────────────────────────────────────────────────

function SupportFiltersTabs({
  counts,
  active,
}: {
  counts: TicketsListResponse["counts"];
  active: SupportFilter;
}) {
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <FilterTab
        href={SUPPORT_BASE_PATH}
        active={active === "all"}
        label="Todos"
        count={counts.open + counts.closed}
      />
      <FilterTab
        href={`${SUPPORT_BASE_PATH}?status=open`}
        active={active === "open"}
        label="Abertos"
        count={counts.open}
        highlight
      />
      <FilterTab
        href={`${SUPPORT_BASE_PATH}?status=closed`}
        active={active === "closed"}
        label="Fechados"
        count={counts.closed}
      />
    </div>
  );
}

function InboxFiltersTabs({
  counts,
  active,
}: {
  counts: TicketsListResponse["counts"];
  active: InboxFilter;
}) {
  const total = counts.open + counts.closed;
  const unread = counts.unreadInbox ?? 0;
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <FilterTab
        href={INBOX_BASE_PATH}
        active={active === "all"}
        label="Todas"
        count={total}
      />
      <FilterTab
        href={`${INBOX_BASE_PATH}?unread=1`}
        active={active === "unread"}
        label="Não lidas"
        count={unread}
        highlight
      />
    </div>
  );
}

function FilterTab({
  href,
  active,
  label,
  count,
  highlight,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  highlight?: boolean;
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
            : highlight && count > 0
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

function SupportStatusBadge({
  status,
  awaitingStaff,
}: {
  status: TicketStatus;
  awaitingStaff: boolean;
}) {
  if (status === "closed") {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        Fechado
      </span>
    );
  }
  if (awaitingStaff) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <MessageCircle className="size-3" />
        Aguardando você
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      Aberto
    </span>
  );
}

function InboxStatusBadge({ readByMe }: { readByMe: boolean }) {
  if (readByMe) {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        Lido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
      <span className="size-1.5 rounded-full bg-brand-primary" />
      Não lido
    </span>
  );
}

function OriginBadge({ origin }: { origin: "email" | "form" }) {
  const Icon = origin === "email" ? Mail : FileText;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
      <Icon className="size-3" />
      {origin === "email" ? "Email" : "Formulário"}
    </span>
  );
}

function EmptyState({
  kind,
  filter,
}: {
  kind: TicketKind;
  filter: string;
}) {
  const text =
    kind === "support"
      ? `Nenhum ticket ${filter === "open" ? "aberto" : filter === "closed" ? "fechado" : ""} no momento.`
      : filter === "unread"
        ? "Inbox em dia. Sem mensagens não lidas."
        : "Nenhuma mensagem na caixa de entrada ainda.";
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
