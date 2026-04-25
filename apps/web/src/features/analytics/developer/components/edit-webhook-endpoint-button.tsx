"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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
import type { WebhookEvent, WebhookEndpointDTO } from "../data";
import { updateWebhookEndpointAction } from "../actions";
import { EventChecklist } from "./event-checklist";

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
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditWebhookEndpointButtonProps {
  endpoint: WebhookEndpointDTO;
  allEvents: WebhookEvent[];
}

/**
 * Edita URL, lista de eventos e enabled/disabled. **Ambiente não é
 * editável** — a regra no backend exige que test/live sejam fixos após
 * criação pra manter o contrato de auditoria ("este endpoint sempre foi
 * de produção"). Pra trocar, delete e crie outro.
 */
export function EditWebhookEndpointButton({
  endpoint,
  allEvents,
}: EditWebhookEndpointButtonProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(
    new Set(endpoint.events),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: endpoint.url, enabled: endpoint.enabled },
  });

  useEffect(() => {
    if (open) return;
    setServerError(null);
    setSelectedEvents(new Set(endpoint.events));
    form.reset({ url: endpoint.url, enabled: endpoint.enabled });
  }, [open, form, endpoint.events, endpoint.url, endpoint.enabled]);

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
    const res = await updateWebhookEndpointAction(endpoint.id, {
      url: values.url,
      enabled: values.enabled,
      events: Array.from(selectedEvents),
    });
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <Pencil className="size-3.5" />
        Editar
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar endpoint</DialogTitle>
            <DialogDescription>
              Altere URL, eventos inscritos ou pause temporariamente. O
              ambiente é fixo — pra mudar, delete e crie outro.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                type="url"
                aria-invalid={form.formState.errors.url ? true : undefined}
                {...form.register("url")}
              />
              {form.formState.errors.url && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.url.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Eventos</Label>
              <EventChecklist
                allEvents={allEvents}
                selected={selectedEvents}
                onToggle={toggleEvent}
                disabled={form.formState.isSubmitting}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-analytics-primary"
                {...form.register("enabled")}
                disabled={form.formState.isSubmitting}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">
                  Endpoint ativo
                </div>
                <div className="text-xs text-gray-500">
                  Desmarque pra pausar entregas sem deletar o cadastro.
                </div>
              </div>
            </label>

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
                {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
