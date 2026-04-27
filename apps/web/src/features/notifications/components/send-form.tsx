"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sendAsOrgAdminAction,
  sendAsStaffAction,
} from "../data";
import {
  SEVERITIES,
  SEVERITY_BADGE_CLASS,
  SEVERITY_LABELS,
  type AudienceDescriptor,
  type Severity,
} from "../types";

type Mode =
  | { kind: "staff" }
  | { kind: "org_admin" };

type AudienceType = AudienceDescriptor["type"];

interface SendFormProps {
  mode: Mode;
}

const STAFF_AUDIENCES: { value: AudienceType; label: string; hint?: string }[] = [
  {
    value: "all_customers",
    label: "Todos os clientes",
    hint: "Todos os usuários (exceto staff).",
  },
  {
    value: "paying_customers",
    label: "Clientes pagantes",
    hint: "Quem tem assinatura ativa.",
  },
  {
    value: "free_customers",
    label: "Clientes gratuitos",
    hint: "Quem não tem assinatura.",
  },
  {
    value: "organization",
    label: "Instituição específica",
    hint: "Todos os membros de uma org.",
  },
  {
    value: "user",
    label: "Usuário individual",
    hint: "Por userId (busque em /kintal/usuarios).",
  },
];

export function SendForm({ mode }: SendFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [link, setLink] = useState("");

  // Audience só aplica em staff mode. Org admin sempre envia pra membros.
  const [audienceType, setAudienceType] = useState<AudienceType>(
    "all_customers",
  );
  const [audienceUserId, setAudienceUserId] = useState("");
  const [audienceOrgId, setAudienceOrgId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setBody("");
    setLink("");
    setSeverity("info");
    setAudienceType("all_customers");
    setAudienceUserId("");
    setAudienceOrgId("");
  }

  function buildAudience(): AudienceDescriptor | null {
    if (mode.kind === "org_admin") {
      // No tipo do server action, audience pra org admin é fixo.
      return { type: "all_customers" }; // ignorado pelo backend org-admin
    }
    switch (audienceType) {
      case "user":
        if (!audienceUserId.trim()) {
          setError("Informe o userId do destinatário.");
          return null;
        }
        return { type: "user", userId: audienceUserId.trim() };
      case "organization":
        if (!audienceOrgId.trim()) {
          setError("Informe o organizationId.");
          return null;
        }
        return {
          type: "organization",
          organizationId: audienceOrgId.trim(),
        };
      case "paying_customers":
      case "free_customers":
      case "all_customers":
        return { type: audienceType };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Título não pode ficar vazio.");
      return;
    }
    if (!body.trim()) {
      setError("Corpo não pode ficar vazio.");
      return;
    }

    const trimmedLink = link.trim() || null;

    startTransition(async () => {
      if (mode.kind === "org_admin") {
        const result = await sendAsOrgAdminAction({
          title: title.trim(),
          body: body.trim(),
          severity,
          link: trimmedLink,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setSuccess(
          `Enviado pra ${result.data.recipientCount} ${result.data.recipientCount === 1 ? "pessoa" : "pessoas"} (${result.data.audienceLabel}).`,
        );
        reset();
        router.refresh();
        return;
      }

      const audience = buildAudience();
      if (!audience) return;

      const result = await sendAsStaffAction({
        title: title.trim(),
        body: body.trim(),
        severity,
        link: trimmedLink,
        audience,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(
        `Enviado pra ${result.data.recipientCount} ${result.data.recipientCount === 1 ? "pessoa" : "pessoas"} (${result.data.audienceLabel}).`,
      );
      reset();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="notif-title">Título</Label>
        <Input
          id="notif-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ex: Manutenção programada amanhã"
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notif-body">Mensagem</Label>
        <Textarea
          id="notif-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="Detalhe o aviso. Texto puro, sem markdown."
          disabled={isPending}
        />
        <span className="text-[11px] text-gray-400">
          {body.length}/1000 caracteres
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Severidade</Label>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                disabled={isPending}
                className={cn(
                  "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                  severity === s
                    ? SEVERITY_BADGE_CLASS[s]
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                )}
              >
                {SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notif-link">Link (opcional)</Label>
          <Input
            id="notif-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://… ou /app/billing"
            disabled={isPending}
          />
          <span className="text-[11px] text-gray-400">
            Click na notificação leva pra esse endereço.
          </span>
        </div>
      </div>

      {mode.kind === "staff" && (
        <div className="flex flex-col gap-2">
          <Label>Audiência</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {STAFF_AUDIENCES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudienceType(opt.value)}
                disabled={isPending}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  audienceType === opt.value
                    ? "border-accent bg-accent/5"
                    : "border-gray-200 bg-white hover:border-gray-300",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-3 shrink-0 rounded-full border-2",
                    audienceType === opt.value
                      ? "border-accent bg-accent"
                      : "border-gray-300",
                  )}
                />
                <div>
                  <div className="text-sm font-medium text-ink">
                    {opt.label}
                  </div>
                  {opt.hint && (
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {opt.hint}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {audienceType === "user" && (
            <Input
              placeholder="userId (24-char hex)"
              value={audienceUserId}
              onChange={(e) => setAudienceUserId(e.target.value)}
              disabled={isPending}
              className="mt-2 font-mono text-xs"
            />
          )}
          {audienceType === "organization" && (
            <Input
              placeholder="organizationId"
              value={audienceOrgId}
              onChange={(e) => setAudienceOrgId(e.target.value)}
              disabled={isPending}
              className="mt-2 font-mono text-xs"
            />
          )}
        </div>
      )}

      {mode.kind === "org_admin" && (
        <div className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-[13px] text-accent">
          Será enviada pra <strong>todos os membros da sua instituição</strong>.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="hover:!bg-gray-800"
        >
          <Send className="size-4" />
          {isPending ? "Enviando..." : "Enviar notificação"}
        </Button>
      </div>
    </form>
  );
}
