"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bot,
  Check,
  CornerDownLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/relative-time";
import type {
  TicketDetailDTO,
  TicketKind,
  TicketMessageDTO,
} from "../data";

interface Props {
  ticket: TicketDetailDTO;
}

/**
 * Tela de detalhe + conversa. Comporta os dois `kind`:
 *
 *  - support → header tem botão Fechar/Reabrir; status badge open/closed
 *  - general → header tem botão Marcar como não lida; auto marca como
 *              lida no mount; status badge lido/não-lido
 *
 * Reply box é o mesmo em ambos. Refresh do router (router.refresh) após
 * cada ação re-fetcha os dados do server.
 */
export function TicketDetail({ ticket }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isInbox = ticket.kind === "general";
  const isArchived = isInbox && ticket.status === "closed";

  // Auto-marca como lida ao abrir (apenas inbox + se ainda não lida).
  useEffect(() => {
    if (!isInbox || ticket.readByMe) return;
    void fetch(`/v1/tickets/${encodeURIComponent(ticket.id)}/read`, {
      method: "POST",
    }).catch(() => {
      // Silencioso — falha aqui não impede o usuário de ler. Próxima
      // visita tenta de novo.
    });
  }, [isInbox, ticket.id, ticket.readByMe]);

  async function close() {
    setActionError(null);
    try {
      const res = await fetch(
        `/v1/tickets/${encodeURIComponent(ticket.id)}/close`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Falha ao fechar ticket.");
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function reopen() {
    setActionError(null);
    try {
      const res = await fetch(
        `/v1/tickets/${encodeURIComponent(ticket.id)}/reopen`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Falha ao reabrir ticket.");
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function markUnread() {
    setActionError(null);
    try {
      const res = await fetch(
        `/v1/tickets/${encodeURIComponent(ticket.id)}/unread`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Falha ao marcar como não lida.");
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  const customerLabel = ticket.customerName ?? ticket.customerEmail;
  // Volta sempre pra view de origem. Quando arquivada, volta pra
  // /inbox?archived=1 pra não jogar o staff numa lista que parece vazia.
  const backHref = isInbox
    ? isArchived
      ? "/kintal/inbox?archived=1"
      : "/kintal/inbox"
    : "/kintal/tickets";
  const backLabel = isInbox ? "Voltar pra caixa de entrada" : "Voltar pra lista";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-8 md:px-10">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      </div>

      <header className="flex flex-col gap-3 border-b border-gray-100 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-medium tracking-tight text-ink">
              {ticket.subject || "(sem assunto)"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
              <span className="font-medium text-ink">{customerLabel}</span>
              <span>·</span>
              <a
                href={`mailto:${ticket.customerEmail}`}
                className="hover:text-ink hover:underline"
              >
                {ticket.customerEmail}
              </a>
              {ticket.userId && (
                <>
                  <span>·</span>
                  <Link
                    href={`/kintal/usuarios/${ticket.userId}`}
                    className="inline-flex items-center gap-0.5 text-brand-primary hover:underline"
                  >
                    Ver usuário
                    <ExternalLink className="size-3" />
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HeaderStatus ticket={ticket} kind={ticket.kind} />
            <HeaderActions
              kind={ticket.kind}
              status={ticket.status}
              isPending={isPending}
              onClose={close}
              onReopen={reopen}
              onMarkUnread={markUnread}
              isArchived={isArchived}
              isInbox={isInbox}
            />
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {actionError}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <ReplyForm ticketId={ticket.id} />
    </div>
  );
}

function HeaderStatus({
  ticket,
  kind,
}: {
  ticket: TicketDetailDTO;
  kind: TicketKind;
}) {
  if (kind === "support") {
    if (ticket.status === "closed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
          <X className="size-3" />
          Fechado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
        Aberto
      </span>
    );
  }
  // inbox: estados possíveis = arquivada / lida / não-lida.
  if (ticket.status === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
        <Archive className="size-3" />
        Arquivada
      </span>
    );
  }
  if (ticket.readByMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
        <Eye className="size-3" />
        Lida
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-1 text-[11px] font-medium text-brand-primary">
      <span className="size-1.5 rounded-full bg-brand-primary" />
      Não lida
    </span>
  );
}

function HeaderActions({
  kind,
  status,
  isPending,
  onClose,
  onReopen,
  onMarkUnread,
  isArchived,
  isInbox,
}: {
  kind: TicketKind;
  status: "open" | "closed";
  isPending: boolean;
  onClose: () => void;
  onReopen: () => void;
  onMarkUnread: () => void;
  isArchived: boolean;
  isInbox: boolean;
}) {
  if (kind === "support") {
    return status === "open" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        Fechar
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReopen}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
        Reabrir
      </Button>
    );
  }
  // inbox (kind=general):
  //  - arquivada (status=closed) → botão "Desarquivar" (reopen)
  //  - ativa (status=open) → "Arquivar" (close) + "Marcar não lida"
  if (isInbox && isArchived) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReopen}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ArchiveRestore className="size-3.5" />
        )}
        Desarquivar
      </Button>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onMarkUnread}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <EyeOff className="size-3.5" />
        )}
        Marcar não lida
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Archive className="size-3.5" />
        )}
        Arquivar
      </Button>
    </>
  );
}

function MessageBubble({ message }: { message: TicketMessageDTO }) {
  const isInbound = message.direction === "inbound";
  const isAuto = message.kind === "auto";
  const author = message.fromName ?? message.fromEmail;

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-4",
        isInbound
          ? "self-start border-gray-100 bg-white"
          : "self-end border-brand-primary/20 bg-brand-primary/5",
        "max-w-[85%]",
      )}
    >
      <header className="flex items-center gap-2 text-[11px] text-gray-500">
        {isAuto && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            <Bot className="size-3" />
            Auto
          </span>
        )}
        <span
          className={cn(
            "font-medium",
            isInbound ? "text-ink" : "text-brand-primary",
          )}
        >
          {author}
        </span>
        <span aria-hidden>·</span>
        <span>{formatRelativeTime(message.createdAt)}</span>
      </header>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {message.bodyText}
      </div>
      {message.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {message.attachments.map((a, idx) => (
            <li key={`${a.filename}-${idx}`}>
              <a
                href={a.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-ink hover:bg-gray-50"
              >
                <Paperclip className="size-3" />
                {a.filename}
                <span className="text-gray-400">({formatBytes(a.size)})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Mensagem não pode ficar vazia.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/v1/tickets/${encodeURIComponent(ticketId)}/replies`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bodyText: body }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(data?.message ?? "Falha ao enviar resposta.");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-gray-500">
        <CornerDownLeft className="size-3.5" />
        Sua resposta
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escreva pro cliente..."
        rows={6}
        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        disabled={submitting}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400">
          A resposta vai pro email do cliente. Ao responder, ele cai
          automaticamente nesta conversa.
        </p>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={submitting || !body.trim()}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Enviar
        </Button>
      </div>
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
