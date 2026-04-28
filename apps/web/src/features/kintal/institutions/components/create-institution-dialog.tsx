"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createInstitutionAction } from "../data";
import { BILLING_MODE_INFO } from "../billing-mode-info";
import type { OrgBillingMode } from "../types";

const SCHEMA = z.object({
  ownerName: z.string().trim().min(1, "Informe o nome do owner."),
  ownerEmail: z.string().trim().email("Email inválido."),
  ownerPassword: z
    .string()
    .min(8, "Mínimo de 8 caracteres.")
    .max(200),
  orgName: z.string().trim().min(1, "Informe o nome da instituição."),
  orgSlug: z
    .string()
    .trim()
    .min(2, "Slug muito curto.")
    .max(40, "Slug muito longo.")
    .regex(
      /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/,
      "Use letras minúsculas, números e traço.",
    ),
  billingMode: z.enum([
    "pool",
    "per_teacher",
    "pay_per_use",
    "unlimited",
  ] as const),
});

type FormValues = z.infer<typeof SCHEMA>;

const SELECTABLE_MODES: OrgBillingMode[] = ["unlimited", "pool"];

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function CreateInstitutionDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA),
    defaultValues: {
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      orgName: "",
      orgSlug: "",
      billingMode: "unlimited",
    },
  });

  async function handleSubmit(values: FormValues) {
    setServerError(null);
    const res = await createInstitutionAction({
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail.toLowerCase(),
      ownerPassword: values.ownerPassword,
      orgName: values.orgName,
      orgSlug: values.orgSlug.toLowerCase(),
      billingMode: values.billingMode,
    });
    if (!res.ok) {
      setServerError(res.message);
      return;
    }
    onOpenChange(false);
    form.reset();
    router.push(`/kintal/instituicoes/${res.organizationId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova instituição</DialogTitle>
          <DialogDescription>
            Cria a organização, o user owner com email/senha definitivos e
            inicializa o modo de cobrança. Email é marcado como verificado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
              Instituição
            </legend>
            <Field label="Nome" error={form.formState.errors.orgName?.message}>
              <Input
                placeholder='Ex: "Colégio Lucida"'
                autoComplete="off"
                {...form.register("orgName")}
              />
            </Field>
            <Field
              label="Slug"
              hint="Identificador único — letras, números e traço."
              error={form.formState.errors.orgSlug?.message}
            >
              <Input
                placeholder="colegio-lucida"
                autoComplete="off"
                {...form.register("orgSlug")}
                onChange={(e) => {
                  form.setValue(
                    "orgSlug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    { shouldValidate: true },
                  );
                }}
              />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
              Owner (administrador)
            </legend>
            <Field label="Nome" error={form.formState.errors.ownerName?.message}>
              <Input
                placeholder="Nome completo"
                autoComplete="off"
                {...form.register("ownerName")}
              />
            </Field>
            <Field
              label="Email"
              error={form.formState.errors.ownerEmail?.message}
            >
              <Input
                type="email"
                placeholder="contato@exemplo.com"
                autoComplete="off"
                {...form.register("ownerEmail")}
              />
            </Field>
            <Field
              label="Senha"
              hint="Mínimo de 8 caracteres. Anote — você precisa entregar manualmente."
              error={form.formState.errors.ownerPassword?.message}
            >
              <Input
                type="text"
                placeholder="••••••••"
                autoComplete="off"
                {...form.register("ownerPassword")}
              />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
              Modo de cobrança
            </legend>
            <Controller
              control={form.control}
              name="billingMode"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2">
                  {SELECTABLE_MODES.map((mode) => {
                    const info = BILLING_MODE_INFO[mode];
                    const selected = field.value === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => field.onChange(mode)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-brand-primary bg-brand-primary/5"
                            : "border-gray-100 bg-white hover:border-gray-200",
                        )}
                      >
                        <div className="text-sm font-medium text-ink">
                          {info.label}
                        </div>
                        <div className="mt-0.5 text-[12px] text-gray-500">
                          {info.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>

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
              onClick={() => onOpenChange(false)}
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
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar instituição"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-gray-500">{hint}</p>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
