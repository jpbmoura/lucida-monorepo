"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CornerDownLeft,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type {
  CountsByBox,
  TicketBox,
  TicketListItemDTO,
  TicketStatus,
  TicketsListResponse,
} from "../data";
import {
  bulkUpdateStatusAction,
  type BulkTargetStatus,
} from "../actions";
import { ComposeEmailDialog } from "./compose-email-dialog";

export type EmailsFilter = "all" | TicketStatus;

interface Props {
  data: TicketsListResponse;
  activeBox: TicketBox;
  /** Filtro ativo via search params. Só aplicado pra inbox. */
  activeFilter: EmailsFilter;
}

const BASE_PATH = "/kintal/emails";

export function EmailsList({ data, activeBox, activeFilter }: Props) {
  const { items, counts } = data;
  const [composeOpen, setComposeOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // Bulk actions só na inbox (decisão do produto). Em outras telas a
  // toolbar nem aparece e os checkboxes ficam ocultos.
  const bulkEnabled = activeBox === "inbox";

  // Reset seleção quando troca de escopo / filtro (URL muda).
  useEffect(() => {
    setSelected(new Set());
  }, [activeBox, activeFilter]);

  // IDs disponíveis na página atual (universo da master checkbox).
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = !allSelected && allIds.some((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size > 0 && allIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allIds);
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BoxTabs counts={counts} active={activeBox} />
        <Button
          variant="primary"
          size="md"
          onClick={() => setComposeOpen(true)}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Novo email
        </Button>
      </div>

      {bulkEnabled && selected.size > 0 ? (
        <BulkActionsBar
          ids={[...selected]}
          onCleared={clearSelection}
        />
      ) : (
        activeBox === "inbox" && (
          <InboxFiltersTabs counts={counts.inbox} active={activeFilter} />
        )
      )}

      {items.length === 0 ? (
        <EmptyState box={activeBox} filter={activeFilter} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                {bulkEnabled && (
                  <th className="w-10 px-4 py-2.5">
                    <SelectCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      ariaLabel={
                        allSelected ? "Limpar seleção" : "Selecionar todos"
                      }
                    />
                  </th>
                )}
                <th className="px-5 py-2.5">
                  {activeBox === "outbox" ? "Para" : "Cliente"}
                </th>
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
                  box={activeBox}
                  isLast={i === items.length - 1}
                  selectable={bulkEnabled}
                  selected={selected.has(item.id)}
                  onToggleSelect={() => toggleOne(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
      />
    </div>
  );
}

function Row({
  item,
  box,
  isLast,
  selectable,
  selected,
  onToggleSelect,
}: {
  item: TicketListItemDTO;
  box: TicketBox;
  isLast: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const customerLabel = item.customerName ?? item.customerEmail;
  const lastActivity = item.lastMessagePreview?.createdAt ?? item.updatedAt;
  // Destaque em verde só faz sentido na inbox (cliente abriu, ninguém viu).
  const highlight = box === "inbox" && item.status === "new";

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-gray-50",
        !isLast && "border-b border-gray-100",
        highlight && "bg-emerald-50/30",
        selected && "bg-sky-50/40",
      )}
    >
      {selectable && (
        <td className="w-10 px-4 py-3">
          <SelectCheckbox
            checked={selected}
            onChange={onToggleSelect}
            ariaLabel={`Selecionar email de ${customerLabel}`}
          />
        </td>
      )}
      <td className="px-5 py-3">
        <Link href={`${BASE_PATH}/${item.id}`} className="block min-w-0">
          <div
            className={cn(
              "truncate",
              highlight ? "font-semibold text-ink" : "font-medium text-ink",
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
              highlight ? "font-semibold text-ink" : "text-ink",
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
          box={box}
        />
      </td>
      <td className="px-5 py-3 text-right text-xs text-gray-500">
        {formatRelativeTime(lastActivity)}
      </td>
    </tr>
  );
}

// ─── Bulk actions toolbar ───────────────────────────────────────────

function BulkActionsBar({
  ids,
  onCleared,
}: {
  ids: string[];
  onCleared: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] =
    useState<BulkTargetStatus | null>(null);

  function run(status: BulkTargetStatus) {
    setError(null);
    setActiveAction(status);
    startTransition(async () => {
      const res = await bulkUpdateStatusAction(ids, status);
      setActiveAction(null);
      if (!res.ok) {
        setError(res.errorMessage ?? "Erro inesperado.");
        return;
      }
      onCleared();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-pill bg-ink/95 px-2 py-1.5 text-white">
        <span className="px-3 text-sm font-medium tabular-nums">
          {ids.length} {ids.length === 1 ? "selecionado" : "selecionados"}
        </span>
        <span className="h-5 w-px bg-white/20" aria-hidden />
        <BulkBtn
          icon={<Mail className="size-4" />}
          label="Lido"
          loading={pending && activeAction === "read"}
          disabled={pending}
          onClick={() => run("read")}
        />
        <BulkBtn
          icon={<Check className="size-4" />}
          label="Concluir"
          loading={pending && activeAction === "done"}
          disabled={pending}
          onClick={() => run("done")}
        />
        <BulkBtn
          icon={<CornerDownLeft className="size-4" />}
          label="Reabrir"
          loading={pending && activeAction === "in_progress"}
          disabled={pending}
          onClick={() => run("in_progress")}
        />
        <span className="ml-auto h-5 w-px bg-white/20" aria-hidden />
        <button
          type="button"
          onClick={onCleared}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <X className="size-3.5" />
          Limpar
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function BulkBtn({
  icon,
  label,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Select checkbox (custom) ───────────────────────────────────────

function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex size-4 items-center justify-center rounded border transition-colors",
        checked || indeterminate
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-gray-300 bg-white hover:border-gray-400",
      )}
    >
      {indeterminate ? (
        <span className="block h-0.5 w-2 bg-white" />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
}

// ─── Primary tabs (inbox / outbox) ──────────────────────────────────

function BoxTabs({
  counts,
  active,
}: {
  counts: CountsByBox;
  active: TicketBox;
}) {
  const inboxNew = counts.inbox.new;
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <BoxTab
        href={`${BASE_PATH}?box=inbox`}
        active={active === "inbox"}
        label="Caixa de entrada"
        count={inboxNew}
        showCount={inboxNew > 0}
      />
      <BoxTab
        href={`${BASE_PATH}?box=outbox`}
        active={active === "outbox"}
        label="Enviados"
      />
    </div>
  );
}

function BoxTab({
  href,
  active,
  label,
  count,
  showCount = false,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  showCount?: boolean;
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
      {showCount && typeof count === "number" && count > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-emerald-700">
          {count}
        </span>
      )}
    </Link>
  );
}

// ─── Inbox sub-tabs (Novos | Em andamento | Todos) ──────────────────

function InboxFiltersTabs({
  counts,
  active,
}: {
  counts: CountsByBox["inbox"];
  active: EmailsFilter;
}) {
  // "Todos" inclui agora também os marcados como `read`.
  const total = counts.new + counts.in_progress + counts.done + counts.read;
  return (
    <div className="inline-flex rounded-pill bg-gray-100 p-1">
      <FilterTab
        href={`${BASE_PATH}?box=inbox&status=new`}
        active={active === "new"}
        label="Novos"
        count={counts.new}
        tone="emerald"
      />
      <FilterTab
        href={`${BASE_PATH}?box=inbox&status=in_progress`}
        active={active === "in_progress"}
        label="Em andamento"
        count={counts.in_progress}
        tone="amber"
      />
      <FilterTab
        href={`${BASE_PATH}?box=inbox`}
        active={active === "all"}
        label="Todos"
        count={total}
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
          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
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
  box,
}: {
  status: TicketStatus;
  awaitingStaff: boolean;
  /** Default `inbox` — afeta o label do `in_progress`. */
  box?: TicketBox;
}) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        Concluído
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        <Mail className="size-3" />
        Lido
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
  // in_progress
  if (awaitingStaff) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <MessageCircle className="size-3" />
        Aguardando você
      </span>
    );
  }
  // Última msg foi outbound. Na outbox, isso significa "esperando o cliente
  // responder o que enviamos"; na inbox, "staff já respondeu, fila parada".
  if (box === "outbox") {
    return (
      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        Aguardando resposta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Em andamento
    </span>
  );
}

function EmptyState({
  box,
  filter,
}: {
  box: TicketBox;
  filter: EmailsFilter;
}) {
  if (box === "outbox") {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
        Nenhum email enviado ainda. Clique em <strong>Novo email</strong> pra
        iniciar uma conversa.
      </div>
    );
  }
  const text =
    filter === "new"
      ? "Nenhum email novo. Inbox em dia."
      : filter === "in_progress"
        ? "Nenhuma conversa em andamento."
        : "Nenhum email recebido até agora.";
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
