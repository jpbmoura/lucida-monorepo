"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TopupId } from "../topups";

interface PixIntent {
  abacateId: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  amountCents: number;
}

interface StatusResponse {
  abacateId: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  effectiveStatus: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  amountCents: number;
  expiresAt: string;
  paidAt: string | null;
}

interface Props {
  /** Topup escolhido. Quando null, o modal está fechado. */
  topupId: TopupId | null;
  /** CPF/CNPJ já normalizado (só dígitos). */
  taxId: string;
  /** Disparado quando o user fecha o modal de qualquer forma. */
  onClose(): void;
}

/**
 * Dialog que conduz o checkout PIX:
 *
 *  1. POST /v1/billing/topup/pix → recebe brCode + brCodeBase64.
 *  2. Mostra QR + botão de copiar código.
 *  3. Polla GET /v1/billing/topup/pix/:id a cada 3s.
 *  4. status=PAID → toast de sucesso + router.refresh() (revalida saldo/ledger).
 *  5. status=EXPIRED → CTA "Gerar novo".
 *
 * O backend marca PAID quando o webhook `transparent.completed` chega.
 * Polling é só leitura do nosso Mongo — barato.
 */
export function PixCheckoutDialog({ topupId, taxId, onClose }: Props) {
  const router = useRouter();
  const [intent, setIntent] = useState<PixIntent | null>(null);
  const [status, setStatus] = useState<StatusResponse["effectiveStatus"]>("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const open = topupId !== null;

  // Cria a cobrança PIX assim que o modal abre. Se o user fechar e
  // reabrir, gera uma nova — não cacheamos.
  useEffect(() => {
    if (!open || !topupId) return;
    let cancelled = false;
    void (async () => {
      setCreating(true);
      setError(null);
      setIntent(null);
      setStatus("PENDING");
      try {
        const res = await fetch("/v1/billing/topup/pix", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topupId, taxId }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(body?.message ?? "Não foi possível gerar o PIX.");
        }
        const { data } = (await res.json()) as { data: PixIntent };
        if (cancelled) return;
        setIntent(data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, topupId, taxId]);

  // Polling de status. Só ativo enquanto o modal está aberto e há intent.
  useEffect(() => {
    if (!open || !intent || status !== "PENDING") return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/v1/billing/topup/pix/${intent.abacateId}`, {
          method: "GET",
        });
        if (!res.ok) return;
        const { data } = (await res.json()) as { data: StatusResponse };
        setStatus(data.effectiveStatus);
        if (data.effectiveStatus === "PAID") {
          // Saldo/ledger mudaram — força revalidação dos server components.
          router.refresh();
        }
      } catch {
        // Erro transitório de rede: o próximo tick tenta de novo.
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [open, intent, status, router]);

  // Reset quando fecha — evita estado vazado entre aberturas.
  useEffect(() => {
    if (!open) {
      setIntent(null);
      setStatus("PENDING");
      setError(null);
      setCopied(false);
    }
  }, [open]);

  async function handleCopy() {
    if (!intent) return;
    try {
      await navigator.clipboard.writeText(intent.brCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard pode falhar em http, ambientes restritos.
      // Fallback: o user seleciona e copia manualmente do <textarea>.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento via PIX</DialogTitle>
          <DialogDescription>
            Escaneie o QR ou copie o código no seu app do banco. O saldo
            entra automaticamente assim que o PIX for confirmado.
          </DialogDescription>
        </DialogHeader>

        {creating && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Gerando QR...
          </div>
        )}

        {error && !creating && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {intent && !creating && status === "PENDING" && (
          <PendingState
            intent={intent}
            copied={copied}
            onCopy={handleCopy}
          />
        )}

        {intent && status === "PAID" && (
          <PaidState onClose={onClose} />
        )}

        {intent && status === "EXPIRED" && (
          <ExpiredState onRetry={() => setIntent(null)} onClose={onClose} />
        )}

        {intent && status === "FAILED" && (
          <ExpiredState onRetry={() => setIntent(null)} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PendingState({
  intent,
  copied,
  onCopy,
}: {
  intent: PixIntent;
  copied: boolean;
  onCopy(): void;
}) {
  const expiresIn = useCountdown(intent.expiresAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-3">
        {/*
          AbacatePay devolve `brCodeBase64` como data URL completo
          (`data:image/png;base64,...`). Não precisa concatenar prefixo.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={intent.brCodeBase64}
          alt="QR code do PIX"
          className="mx-auto size-48 rounded-md"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Código copia e cola
        </div>
        <div className="flex items-stretch gap-2">
          <code className="flex-1 truncate rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
            {intent.brCode}
          </code>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Valor: {formatBRL(intent.amountCents)}</span>
        <span className={cn(expiresIn === null && "text-red-600")}>
          {expiresIn === null
            ? "Cobrança expirada"
            : `Expira em ${expiresIn}`}
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-gray-500">
        Esta página detecta o pagamento automaticamente — pode deixar
        aberta enquanto paga.
      </p>
    </div>
  );
}

function PaidState({ onClose }: { onClose(): void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="size-7" strokeWidth={3} />
      </span>
      <div>
        <h3 className="text-lg font-medium text-ink">Pagamento confirmado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Seus créditos já estão disponíveis na conta.
        </p>
      </div>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onClose}
      >
        Fechar
      </Button>
    </div>
  );
}

function ExpiredState({
  onRetry,
  onClose,
}: {
  onRetry(): void;
  onClose(): void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div>
        <h3 className="text-lg font-medium text-ink">Cobrança expirada</h3>
        <p className="mt-1 text-sm text-gray-500">
          O prazo pra pagar acabou. Você pode gerar uma nova cobrança PIX
          agora mesmo.
        </p>
      </div>
      <div className="flex w-full gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onClose}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onRetry}
          className="flex-1"
        >
          Gerar nova cobrança
        </Button>
      </div>
    </div>
  );
}

/**
 * Devolve `mm:ss` até `expiresAt` — null quando passou. Atualiza a
 * cada segundo e limpa o intervalo no unmount.
 */
function useCountdown(expiresAt: string): string | null {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = target - now;
  if (diff <= 0) return null;
  const minutes = Math.floor(diff / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
