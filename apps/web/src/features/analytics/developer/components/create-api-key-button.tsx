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
import type { ApiKeyEnvironment, ApiKeyScope } from "../data";
import { createApiKeyAction } from "../actions";
import { ScopeChecklist } from "./scope-checklist";
import { SecretRevealPanel } from "./secret-reveal-panel";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome pra identificar a chave.")
    .max(80),
  environment: z.enum(["live", "test"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateApiKeyButtonProps {
  allScopes: ApiKeyScope[];
}

/**
 * Fluxo de criação de API key. Dois estados internos:
 *   - `form`: usuário preenche nome, ambiente e escopos
 *   - `reveal`: mostra o plaintext com botão de copiar (único momento)
 *
 * Fechar o dialog (em qualquer estado) reseta tudo. O `revalidatePath`
 * do server action já repopula a tabela — não precisa de router.refresh.
 */
export function CreateApiKeyButton({ allScopes }: CreateApiKeyButtonProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"form" | "reveal">("form");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<Set<ApiKeyScope>>(
    new Set(),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", environment: "test" },
  });

  useEffect(() => {
    if (open) return;
    // Reset completo ao fechar — próxima abertura começa do zero.
    setPhase("form");
    setPlaintext(null);
    setServerError(null);
    setSelectedScopes(new Set());
    form.reset({ name: "", environment: "test" });
  }, [open, form]);

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await createApiKeyAction({
      name: values.name,
      environment: values.environment,
      scopes: Array.from(selectedScopes),
    });
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setPlaintext(res.data.plaintext);
    setPhase("reveal");
  }

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova chave
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {phase === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Criar chave de API</DialogTitle>
                <DialogDescription>
                  Defina um nome pra identificar a chave, o ambiente e as
                  permissões. A chave é gerada uma única vez — copie logo
                  após criar.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="api-key-name">Nome</Label>
                  <Input
                    id="api-key-name"
                    type="text"
                    autoFocus
                    placeholder="ex: integração SIS principal"
                    aria-invalid={
                      form.formState.errors.name ? true : undefined
                    }
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Ambiente</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <EnvironmentOption
                      value="test"
                      label="Test"
                      hint="Não consome créditos nem dispara webhooks reais"
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
                      hint="Produção — consome créditos da instituição"
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
                  <Label>Escopos</Label>
                  <p className="text-xs text-gray-500">
                    Marque o que essa chave poderá fazer. Pode ser alterado
                    criando uma nova chave com os escopos novos (não há
                    edição in-place).
                  </p>
                  <ScopeChecklist
                    allScopes={allScopes}
                    selected={selectedScopes}
                    onToggle={toggleScope}
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
                      ? "Gerando..."
                      : "Gerar chave"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Chave criada</DialogTitle>
                <DialogDescription>
                  Copie o valor abaixo e armazene em segurança. Depois que
                  este dialog fechar, só é possível ver os 4 últimos
                  caracteres.
                </DialogDescription>
              </DialogHeader>

              {plaintext && (
                <SecretRevealPanel
                  label="Chave de API"
                  secret={plaintext}
                  hint="Use como `Authorization: Bearer ...` quando as rotas públicas forem liberadas."
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
      className={
        checked
          ? "rounded-xl border-2 border-analytics-primary bg-analytics-primary/5 p-3 text-left transition-all"
          : "rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-gray-300"
      }
      data-value={value}
    >
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-xs text-gray-500">{hint}</div>
    </button>
  );
}
