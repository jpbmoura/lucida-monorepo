"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyEnvironment, WebhookEvent } from "../data";
import { createWebhookEndpointAction } from "../actions";
import { EventChecklist } from "./event-checklist";
import { SecretRevealPanel } from "./secret-reveal-panel";

const formSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL é obrigatória.")
    .refine((v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    }, "URL inválida."),
  environment: z.enum(["live", "test"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateWebhookEndpointButtonProps {
  allEvents: WebhookEvent[];
}

export function CreateWebhookEndpointButton({
  allEvents,
}: CreateWebhookEndpointButtonProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"form" | "reveal">("form");
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(
    new Set(),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", environment: "test" },
  });

  useEffect(() => {
    if (open) return;
    setPhase("form");
    setSigningSecret(null);
    setServerError(null);
    setSelectedEvents(new Set());
    form.reset({ url: "", environment: "test" });
  }, [open, form]);

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await createWebhookEndpointAction({
      url: values.url,
      environment: values.environment,
      events: Array.from(selectedEvents),
    });
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setSigningSecret(res.data.signingSecret);
    setPhase("reveal");
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Novo endpoint
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {phase === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Novo endpoint de webhook</DialogTitle>
                <DialogDescription>
                  Informe a URL que vai receber os eventos e marque
                  quais eventos te interessam. Disparos ainda não estão
                  ativos — será liberado em iteração futura.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    autoFocus
                    placeholder="https://seu-backend/webhooks/lucida"
                    aria-invalid={form.formState.errors.url ? true : undefined}
                    {...form.register("url")}
                  />
                  {form.formState.errors.url && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.url.message}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500">
                    Em <strong>live</strong>, apenas HTTPS é aceito. Em{" "}
                    <strong>test</strong>, HTTP é permitido se for
                    localhost.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Ambiente</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <EnvironmentOption
                      value="test"
                      label="Test"
                      hint="Recebe apenas disparos de chaves test"
                      checked={form.watch("environment") === "test"}
                      onSelect={() =>
                        form.setValue("environment", "test", {
                          shouldDirty: true,
                        })
                      }
                    />
                    <EnvironmentOption
                      value="live"
                      label="Live"
                      hint="Recebe disparos de produção"
                      checked={form.watch("environment") === "live"}
                      onSelect={() =>
                        form.setValue("environment", "live", {
                          shouldDirty: true,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Eventos</Label>
                  <p className="text-xs text-gray-500">
                    Só os eventos marcados serão entregues. Pode editar
                    depois sem rotacionar o secret.
                  </p>
                  <EventChecklist
                    allEvents={allEvents}
                    selected={selectedEvents}
                    onToggle={toggleEvent}
                    disabled={form.formState.isSubmitting}
                  />
                </div>

                {serverError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {serverError}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setOpen(false)}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? "Criando..."
                      : "Criar endpoint"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Endpoint criado</DialogTitle>
                <DialogDescription>
                  Guarde o signing secret abaixo. Ele será usado pra
                  verificar a assinatura dos payloads via HMAC-SHA256
                  quando os disparos forem ligados.
                </DialogDescription>
              </DialogHeader>

              {signingSecret && (
                <SecretRevealPanel
                  label="Signing secret"
                  secret={signingSecret}
                  hint="Armazene como variável de ambiente no seu backend — valide `X-Lucida-Signature` comparando com HMAC(secret, timestamp + '.' + body)."
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setOpen(false)}
                >
                  Já guardei
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EnvironmentOption({
  value,
  label,
  hint,
  checked,
  onSelect,
}: {
  value: ApiKeyEnvironment;
  label: string;
  hint: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      data-value={value}
      className={
        checked
          ? "rounded-xl border-2 border-analytics-primary bg-analytics-primary/5 p-3 text-left transition-all"
          : "rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-gray-300"
      }
    >
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-xs text-gray-500">{hint}</div>
    </button>
  );
}
