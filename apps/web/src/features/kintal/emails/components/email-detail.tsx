"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CornerDownLeft,
  Loader2,
  MessageCircle,
  Paperclip,
  RotateCcw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/relative-time";
import type { KintalUserDetail } from "@/features/kintal/users/types";
import type { TicketDetailDTO, TicketMessageDTO, TicketStatus } from "../data";
import { InfoPanel } from "./info-panel";

interface Props {
  ticket: TicketDetailDTO;
  /** Cadastro Lucida do remetente. Null quando não é cliente cadastrado
   *  ou quando o lookup por id falhou. */
  customer: KintalUserDetail | null;
}

/**
 * Tela de detalhe + conversa. Status flui new → in_progress → done.
 * Reply automaticamente progride new → in_progress no backend
 * (`Ticket.addOutboundMessage`). UI expõe ações pra concluir e reabrir.
 *
 * Refresh do router (router.refresh) após cada ação re-fetcha os dados
 * do server.
 */
export function EmailDetail({ ticket, customer }: Props) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function markDone() {
    setActionError(null);
    try {
      const res = await fetch(
        `/v1/tickets/${encodeURIComponent(ticket.id)}/done`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Falha ao concluir email.");
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
      if (!res.ok) throw new Error("Falha ao reabrir email.");
      startTransition(() => router.refresh());
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  const customerLabel = ticket.customerName ?? ticket.customerEmail;
  // Volta sempre pra view de origem. Quando concluído, volta pra
  // /emails?status=done pra não jogar o staff numa lista que parece vazia.
  const backHref =
    ticket.status === "done"
      ? "/kintal/emails?status=done"
      : ticket.status === "new"
        ? "/kintal/emails?status=new"
        : "/kintal/emails";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Thread */}
        <main className="flex min-w-0 flex-col gap-6">
          <div>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Voltar pra lista
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
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HeaderStatus
                  status={ticket.status}
                  awaitingStaff={ticket.awaitingStaff}
                />
                <HeaderActions
                  status={ticket.status}
                  isPending={isPending}
                  onMarkDone={markDone}
                  onReopen={reopen}
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
        </main>

        {/* Painel lateral. Em <lg fica abaixo da thread (ordem natural).
            Em >=lg fica sticky abaixo do topbar do Kintal (h-[72px]) +
            margem de respiro. */}
        <aside>
          <div className="lg:sticky lg:top-22">
            <InfoPanel
              customerEmail={ticket.customerEmail}
              customerName={ticket.customerName}
              user={customer}
              ticketCreatedAt={ticket.createdAt}
              relatedTickets={ticket.relatedTickets}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function HeaderStatus({
  status,
  awaitingStaff,
}: {
  status: TicketStatus;
  awaitingStaff: boolean;
}) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
        <Check className="size-3" />
        Concluído
      </span>
    );
  }
  if (status === "new") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Novo
      </span>
    );
  }
  if (awaitingStaff) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
        <MessageCircle className="size-3" />
        Aguardando você
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
      Em andamento
    </span>
  );
}

function HeaderActions({
  status,
  isPending,
  onMarkDone,
  onReopen,
}: {
  status: TicketStatus;
  isPending: boolean;
  onMarkDone: () => void;
  onReopen: () => void;
}) {
  if (status === "done") {
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
          <RotateCcw className="size-3.5" />
        )}
        Reabrir
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onMarkDone}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5" />
      )}
      Concluir
    </Button>
  );
}

function MessageBubble({ message }: { message: TicketMessageDTO }) {
  const isInbound = message.direction === "inbound";
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
