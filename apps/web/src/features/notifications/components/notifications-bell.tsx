"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dismissNotificationAction,
  fetchInbox,
  fetchUnreadCount,
  markAllAsReadAction,
  markAsReadAction,
} from "../data";
import {
  SEVERITY_DOT_CLASS,
  type InboxItem,
} from "../types";

interface NotificationsBellProps {
  /** Onde o link "Ver todas" leva. Cada area expõe a sua inbox. */
  inboxHref: string;
  /** Polling interval em ms. Default 60s — bom equilíbrio entre fresh
   * data e custo. Defina 0 pra desabilitar polling. */
  pollIntervalMs?: number;
}

const POPOVER_LIMIT = 8;

/**
 * Bell icon do topbar com contador de não-lidos (badge) e popover. Polling
 * leve a cada 60s + refetch on focus mantém o badge atualizado sem WS.
 *
 * Usado em /app e /analytics — `inboxHref` distingue qual página completa
 * o "Ver todas" abre.
 */
export function NotificationsBell({
  inboxHref,
  pollIntervalMs = 60_000,
}: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Polling do count + refetch on focus.
  useEffect(() => {
    let canceled = false;

    async function refresh() {
      try {
        const count = await fetchUnreadCount();
        if (!canceled) setUnreadCount(count);
      } catch {
        // Silencioso — bell não deve gritar quando offline.
      }
    }

    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval =
      pollIntervalMs > 0 ? setInterval(() => void refresh(), pollIntervalMs) : null;

    return () => {
      canceled = true;
      window.removeEventListener("focus", onFocus);
      if (interval) clearInterval(interval);
    };
  }, [pollIntervalMs]);

  // Quando abre o popover, carrega últimas N. Refetch ao reabrir.
  useEffect(() => {
    if (!open) return;
    let canceled = false;
    setLoading(true);
    fetchInbox({ limit: POPOVER_LIMIT })
      .then((list) => {
        if (!canceled) setItems(list);
      })
      .catch(() => {
        if (!canceled) setItems([]);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [open]);

  // Fecha popover ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target?.closest("[data-bell-popover]")) {
        setOpen(false);
      }
    }
    // Delay pra evitar fechar imediato no mesmo click do botão.
    const t = setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  function handleItemClick(item: InboxItem) {
    if (!item.readAt) {
      // Optimistic update — backend confirma em background.
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void markAsReadAction(item.id);
    }
    if (item.link) {
      setOpen(false);
      // Internal links via router; external via window.
      if (item.link.startsWith("/")) {
        router.push(item.link);
      } else {
        window.open(item.link, "_blank", "noopener,noreferrer");
      }
    }
  }

  function handleDismiss(e: React.MouseEvent, item: InboxItem) {
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (!item.readAt) setUnreadCount((c) => Math.max(0, c - 1));
    void dismissNotificationAction(item.id);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (result.ok) {
        setItems((prev) =>
          prev.map((i) => ({
            ...i,
            readAt: i.readAt ?? new Date().toISOString(),
          })),
        );
        setUnreadCount(0);
      }
    });
  }

  return (
    <div className="relative" data-bell-popover>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificações não lidas`
            : "Notificações"
        }
        className="relative grid size-9 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <Bell className="size-4.5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-[360px] flex-col rounded-2xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-ink">Notificações</div>
              {unreadCount > 0 && (
                <div className="text-[11px] text-gray-500">
                  {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
              >
                <Check className="size-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-10 text-center text-xs text-gray-400">
                Carregando…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-gray-400">
                Nada por aqui ainda.
              </div>
            ) : (
              <ul>
                {items.map((item, i) => (
                  <li
                    key={item.id}
                    className={
                      i < items.length - 1 ? "border-b border-gray-50" : ""
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                        !item.readAt && "bg-accent/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          SEVERITY_DOT_CLASS[item.severity],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-medium text-ink">
                            {item.title}
                          </span>
                          {!item.readAt && (
                            <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                          {item.body}
                        </p>
                        <div className="mt-1 text-[10px] text-gray-400">
                          {formatRelative(item.createdAt)}
                        </div>
                      </div>
                      <span
                        role="button"
                        aria-label="Dispensar notificação"
                        onClick={(e) => handleDismiss(e, item)}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <X className="size-3.5" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href={inboxHref}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-gray-600 hover:text-ink"
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
