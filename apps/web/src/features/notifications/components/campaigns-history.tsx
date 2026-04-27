"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteOrgAdminCampaignAction,
  deleteStaffCampaignAction,
} from "../data";
import {
  SEVERITY_BADGE_CLASS,
  SEVERITY_LABELS,
  type CampaignSummary,
} from "../types";

interface CampaignsHistoryProps {
  campaigns: CampaignSummary[];
  /** Define qual server action é usada pro delete. */
  mode: "staff" | "org_admin";
}

export function CampaignsHistory({ campaigns, mode }: CampaignsHistoryProps) {
  if (campaigns.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-500">
        Nenhuma campanha enviada ainda.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <header className="border-b border-gray-100 px-7 py-6">
        <h2 className="text-xl font-medium tracking-tight text-ink">
          Histórico de{" "}
          <span className="font-serif text-[1.1em] italic text-gray-500">
            envios
          </span>
        </h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          {campaigns.length}{" "}
          {campaigns.length === 1 ? "campanha enviada" : "campanhas enviadas"}.
        </p>
      </header>
      <ul>
        {campaigns.map((c, i) => (
          <li
            key={c.campaignId}
            className={
              i < campaigns.length - 1 ? "border-b border-gray-50" : undefined
            }
          >
            <CampaignRow campaign={c} mode={mode} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CampaignRow({
  campaign,
  mode,
}: {
  campaign: CampaignSummary;
  mode: "staff" | "org_admin";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const action =
        mode === "staff"
          ? deleteStaffCampaignAction
          : deleteOrgAdminCampaignAction;
      const result = await action(campaign.campaignId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-7 py-5 md:grid-cols-[1fr_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-ink">{campaign.title}</span>
          <span
            className={cn(
              "rounded-pill border px-2 py-0.5 text-[10px] font-medium",
              SEVERITY_BADGE_CLASS[campaign.severity],
            )}
          >
            {SEVERITY_LABELS[campaign.severity]}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-gray-600">
          {campaign.body}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {campaign.recipientCount}{" "}
            {campaign.recipientCount === 1 ? "destinatário" : "destinatários"}
          </span>
          <span className="text-gray-300">·</span>
          <span>
            {campaign.readCount} {campaign.readCount === 1 ? "leu" : "leram"} (
            {campaign.readRatePct}%)
          </span>
          <span className="text-gray-300">·</span>
          <span>{formatDate(campaign.createdAt)}</span>
        </div>
        <div className="mt-1 inline-block rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
          {campaign.audienceLabel}
        </div>
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        {error && (
          <span className="text-[11px] text-red-600">{error}</span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
            confirming
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700",
          )}
        >
          <Trash2 className="size-3.5" />
          {isPending
            ? "Removendo..."
            : confirming
              ? "Confirmar"
              : "Retirar campanha"}
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
