"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dismissNotificationAction,
  markAllAsReadAction,
  markAsReadAction,
} from "../data";
import {
  SEVERITY_BADGE_CLASS,
  SEVERITY_DOT_CLASS,
  SEVERITY_LABELS,
  type InboxItem,
} from "../types";

interface InboxListProps {
  initialItems: InboxItem[];
}

export function InboxList({ initialItems }: InboxListProps) {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();

  const visible = filter === "unread" ? items.filter((i) => !i.readAt) : items;
  const unreadCount = items.filter((i) => !i.readAt).length;

  function handleClick(item: InboxItem) {
    if (!item.readAt) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
      void markAsReadAction(item.id);
    }
    if (item.link) {
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
    void dismissNotificationAction(item.id);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (result.ok) {
        const now = new Date().toISOString();
        setItems((prev) =>
          prev.map((i) => ({ ...i, readAt: i.readAt ?? now })),
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex shrink-0 rounded-pill bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
              filter === "all"
                ? "bg-white text-ink shadow-soft"
                : "text-gray-500 hover:text-ink",
            )}
          >
            Todas ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
              filter === "unread"
                ? "bg-white text-ink shadow-soft"
                : "text-gray-500 hover:text-ink",
            )}
          >
            Não lidas ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-pill border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-ink"
          >
            <Check className="size-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white">
          <div className="flex flex-col items-center gap-2 px-7 py-20 text-center">
            <p className="text-sm font-medium text-ink">
              {filter === "unread"
                ? "Nenhuma não lida."
                : "Caixa vazia."}
            </p>
            <p className="max-w-sm text-[13px] text-gray-500">
              {filter === "unread"
                ? "Você está em dia."
                : "Quando alguém te enviar algo, aparece aqui."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleClick(item)}
                className={cn(
                  "group flex w-full items-start gap-4 rounded-2xl border bg-white px-5 py-4 text-left transition-colors",
                  !item.readAt
                    ? "border-accent/20 hover:border-accent/40"
                    : "border-gray-100 hover:border-gray-200",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    SEVERITY_DOT_CLASS[item.severity],
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-ink">
                      {item.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-pill border px-2 py-0.5 text-[10px] font-medium",
                        SEVERITY_BADGE_CLASS[item.severity],
                      )}
                    >
                      {SEVERITY_LABELS[item.severity]}
                    </span>
                    {!item.readAt && (
                      <span className="size-1.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-600">
                    {item.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{formatRelative(item.createdAt)}</span>
                    {item.link && (
                      <span className="inline-flex items-center gap-0.5 text-accent">
                        <ExternalLink className="size-2.5" />
                        link
                      </span>
                    )}
                  </div>
                </div>

                <span
                  role="button"
                  aria-label="Dispensar"
                  onClick={(e) => handleDismiss(e, item)}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="size-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
