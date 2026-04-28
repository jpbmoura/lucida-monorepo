"use client";

import { useState } from "react";
import { Check, CreditCard, Loader2, Package, QrCode, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { isValidTaxId, normalizeTaxId } from "@/lib/tax-id";
import { formatBRL } from "../plans";
import {
  TOPUP_LIST,
  costPer1kCredits,
  type TopupDefinition,
  type TopupId,
} from "../topups";
import { TaxIdPromptDialog } from "./tax-id-prompt-dialog";
import { PixCheckoutDialog } from "./pix-checkout-dialog";

type PaymentMethod = "card" | "pix";

/**
 * Grid de cards de top-up. Cada card oferece dois métodos:
 *  - Cartão → Stripe Checkout (redirect).
 *  - PIX    → modal com QR + polling.
 *
 * Ambos exigem `taxId` no perfil. Se o user ainda não tem, abre
 * `TaxIdPromptDialog` antes — depois reentra no fluxo escolhido.
 */
export function TopupsSection() {
  const session = authClient.useSession();
  const persistedTaxId = readTaxIdFromSession(session.data?.user);

  const [loading, setLoading] = useState<{
    topupId: TopupId;
    method: PaymentMethod;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quando o user clica num botão sem taxId, guardamos a intenção aqui
  // e abrimos o prompt. Depois que ele salva, retomamos automaticamente.
  const [pendingAction, setPendingAction] = useState<{
    topupId: TopupId;
    method: PaymentMethod;
  } | null>(null);

  // Modal PIX — null = fechado.
  const [pixTopup, setPixTopup] = useState<TopupId | null>(null);

  async function startCardCheckout(id: TopupId) {
    setError(null);
    setLoading({ topupId: id, method: "card" });
    try {
      const res = await fetch("/v1/billing/topup/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topupId: id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { code?: string; message?: string }
          | null;
        throw new Error(body?.message ?? "Não foi possível iniciar a compra.");
      }
      const { data } = (await res.json()) as { data: { url: string } };
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }

  function startPixCheckout(id: TopupId) {
    setError(null);
    setPixTopup(id);
  }

  function start(topupId: TopupId, method: PaymentMethod) {
    if (!persistedTaxId || !isValidTaxId(persistedTaxId)) {
      setPendingAction({ topupId, method });
      return;
    }
    if (method === "card") {
      void startCardCheckout(topupId);
    } else {
      startPixCheckout(topupId);
    }
  }

  function handleTaxIdSaved(savedTaxId: string) {
    if (!pendingAction) return;
    const { topupId, method } = pendingAction;
    setPendingAction(null);
    // O hook useSession pode demorar a re-fetch; usamos o valor salvo
    // direto pra não esperar o invalidate.
    if (method === "card") {
      void startCardCheckout(topupId);
    } else {
      // PIX precisa do taxId no body — passa direto via state, sem
      // depender do session refresh.
      setPixTopup(topupId);
      // savedTaxId é usado pelo modal via `taxId={savedTaxId}` quando
      // session ainda não carregou; ver resolveTaxIdForPix abaixo.
      setOptimisticTaxId(savedTaxId);
    }
  }

  // Se o user acabou de salvar, usamos o valor "optimistic" enquanto a
  // session do BetterAuth não revalida. Depois disso, passamos a usar
  // `persistedTaxId`.
  const [optimisticTaxId, setOptimisticTaxId] = useState<string | null>(null);
  const taxIdForPix = persistedTaxId ?? optimisticTaxId ?? "";

  return (
    <section className="mb-12">
      <header className="mb-5 flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Pacotes avulsos
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-ink">
          Precisa de mais créditos?
        </h2>
        <p className="text-sm text-gray-500">
          Compra única, sem renovação. Créditos avulsos valem por 12 meses e
          são consumidos depois dos da assinatura.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TOPUP_LIST.map((topup) => (
          <TopupCard
            key={topup.id}
            topup={topup}
            loading={loading?.topupId === topup.id ? loading.method : null}
            disabledByOther={loading !== null && loading.topupId !== topup.id}
            onSelect={(method) => start(topup.id, method)}
          />
        ))}
      </div>

      <TaxIdPromptDialog
        open={pendingAction !== null}
        onOpenChange={(v) => {
          if (!v) setPendingAction(null);
        }}
        onSaved={handleTaxIdSaved}
      />

      <PixCheckoutDialog
        topupId={pixTopup}
        taxId={normalizeTaxId(taxIdForPix)}
        onClose={() => setPixTopup(null)}
      />
    </section>
  );
}

function TopupCard({
  topup,
  loading,
  disabledByOther,
  onSelect,
}: {
  topup: TopupDefinition;
  loading: PaymentMethod | null;
  disabledByOther: boolean;
  onSelect(method: PaymentMethod): void;
}) {
  const isPopular = topup.highlight === "popular";
  const isBestValue = topup.highlight === "best-value";
  const costPer1k = costPer1kCredits(topup);

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border bg-white p-6 transition-shadow",
        isPopular && "border-brand-primary shadow-pop",
        isBestValue && "border-ink",
        !isPopular && !isBestValue && "border-gray-100 shadow-soft",
      )}
    >
      {topup.highlight && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white",
            isPopular ? "bg-brand-primary" : "bg-ink",
          )}
        >
          {isPopular ? (
            <>
              <Sparkles className="size-3" />
              Mais popular
            </>
          ) : (
            <>
              <Zap className="size-3" />
              Melhor custo
            </>
          )}
        </span>
      )}

      <header>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Package className="size-3.5" />
          Pacote
        </div>
        <h3 className="mt-1 text-lg font-medium text-ink">{topup.name}</h3>
      </header>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-medium tabular-nums tracking-tighter text-ink">
            {topup.credits.toLocaleString("pt-BR")}
          </span>
          <span className="text-sm text-gray-400">créditos</span>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">{topup.tagline}</div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-medium tabular-nums text-ink">
            {formatBRL(topup.priceCents)}
          </span>
          <span className="text-[11px] text-gray-500 tabular-nums">
            {formatBRL(Math.round(costPer1k))}/1k
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 text-[12px] text-gray-600">
        <Bullet>Validade de 12 meses</Bullet>
        <Bullet>Consumido após os da assinatura</Bullet>
        <Bullet>Sem renovação automática</Bullet>
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          variant={isPopular ? "primary" : "outline"}
          size="md"
          onClick={() => onSelect("card")}
          disabled={disabledByOther || loading !== null}
          className={cn(!isPopular && !isBestValue && "border-gray-200")}
        >
          {loading === "card" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Cartão
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => onSelect("pix")}
          disabled={disabledByOther || loading !== null}
          className="border-gray-200"
        >
          {loading === "pix" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            <>
              <QrCode className="size-4" />
              PIX
            </>
          )}
        </Button>
      </div>
    </article>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Check className="size-2" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

/**
 * Lê `taxId` da session BetterAuth. additionalFields é dinâmico em
 * runtime; o cast localizado evita poluir o tipo público.
 */
function readTaxIdFromSession(user: unknown): string | null {
  if (typeof user !== "object" || user === null) return null;
  const value = (user as { taxId?: unknown }).taxId;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
