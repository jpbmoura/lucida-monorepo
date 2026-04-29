"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { formatTaxId } from "@/lib/tax-id";
import { formatCep, lookupCep } from "@/lib/viacep";

interface Props {
  organizationId: string;
  initial: {
    taxId: string | null;
    legalName: string | null;
    municipalRegistration: string | null;
    addressPostalCode: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    addressCityCode: string | null;
    addressCityName: string | null;
    addressStateUf: string | null;
  };
}

const fiscalSchema = z.object({
  taxId: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length === 14,
      "CNPJ precisa ter 14 dígitos.",
    ),
  legalName: z.string().max(200).optional(),
  municipalRegistration: z.string().max(40).optional(),
  addressPostalCode: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length === 8,
      "CEP precisa ter 8 dígitos.",
    ),
  addressStreet: z.string().max(200).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(120).optional(),
  addressDistrict: z.string().max(120).optional(),
  addressCityCode: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{7}$/.test(v),
      "Código IBGE precisa ter 7 dígitos.",
    ),
  addressCityName: z.string().max(120).optional(),
  addressStateUf: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[A-Za-z]{2}$/.test(v),
      "UF: 2 letras (ex: SP).",
    ),
});

type FormValues = z.infer<typeof fiscalSchema>;

/**
 * Card editável com os dados fiscais da organização. Mostrado em
 * /analytics/configuracoes pra owner/admin. Org é sempre PJ (legal entity)
 * — esses dados viram o tomador da NFS-e em pagamentos institucionais.
 *
 * Persiste via `authClient.organization.update` — o plugin organization do
 * BetterAuth aceita os campos definidos em `additionalFields` do schema
 * (ver `apps/api/src/domains/iam/.../auth.ts`). Permissão de edição
 * (owner/admin) é enforced pelo plugin.
 */
export function OrgFiscalDataCard({ organizationId, initial }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(fiscalSchema),
    defaultValues: {
      taxId: initial.taxId ? formatTaxId(initial.taxId) : "",
      legalName: initial.legalName ?? "",
      municipalRegistration: initial.municipalRegistration ?? "",
      addressPostalCode: initial.addressPostalCode
        ? formatCep(initial.addressPostalCode)
        : "",
      addressStreet: initial.addressStreet ?? "",
      addressNumber: initial.addressNumber ?? "",
      addressComplement: initial.addressComplement ?? "",
      addressDistrict: initial.addressDistrict ?? "",
      addressCityCode: initial.addressCityCode ?? "",
      addressCityName: initial.addressCityName ?? "",
      addressStateUf: initial.addressStateUf ?? "",
    },
  });

  async function handleCepBlur(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const result = await lookupCep(digits);
      if (!result) return;
      const c = form.getValues();
      if (!c.addressStreet)
        form.setValue("addressStreet", result.logradouro, { shouldDirty: true });
      if (!c.addressDistrict)
        form.setValue("addressDistrict", result.bairro, { shouldDirty: true });
      if (!c.addressCityName)
        form.setValue("addressCityName", result.localidade, { shouldDirty: true });
      if (!c.addressStateUf)
        form.setValue("addressStateUf", result.uf, { shouldDirty: true });
      if (!c.addressCityCode)
        form.setValue("addressCityCode", result.ibge, { shouldDirty: true });
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);
    const data: Record<string, unknown> = {
      taxId: values.taxId?.replace(/\D/g, "") ?? "",
      legalName: values.legalName?.trim() ?? "",
      municipalRegistration: values.municipalRegistration?.trim() ?? "",
      addressPostalCode: values.addressPostalCode?.replace(/\D/g, "") ?? "",
      addressStreet: values.addressStreet?.trim() ?? "",
      addressNumber: values.addressNumber?.trim() ?? "",
      addressComplement: values.addressComplement?.trim() ?? "",
      addressDistrict: values.addressDistrict?.trim() ?? "",
      addressCityCode: values.addressCityCode ?? "",
      addressCityName: values.addressCityName?.trim() ?? "",
      addressStateUf: values.addressStateUf?.toUpperCase() ?? "",
      addressCountry: "BR",
    };

    try {
      // additionalFields da org não viajam pelo tipo do client — cast
      // localizado, mesmo padrão de TaxIdPromptDialog/profile-form.
      const res = await authClient.organization.update({
        organizationId,
        data,
      } as unknown as Parameters<typeof authClient.organization.update>[0]);
      if (res.error) {
        setServerError(res.error.message ?? "Não foi possível salvar.");
        return;
      }
      form.reset(values);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setServerError((err as Error).message ?? "Erro inesperado.");
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-start gap-4 border-b border-gray-100 pb-4">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <Building2 className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            Dados fiscais
          </div>
          <h2 className="text-lg font-medium text-ink">
            Identidade fiscal da instituição
          </h2>
          <p className="text-[13px] leading-relaxed text-gray-500">
            CNPJ, razão social e endereço — usados na emissão de notas fiscais
            quando a cobrança for institucional.
          </p>
        </div>
      </header>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="CNPJ">
            <Controller
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <Input
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatTaxId(e.target.value))}
                  onBlur={field.onBlur}
                />
              )}
            />
            {form.formState.errors.taxId && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.taxId.message}
              </p>
            )}
          </Field>
          <Field
            label="Inscrição Municipal"
            hint="Opcional — exigida em alguns municípios"
          >
            <Input
              inputMode="numeric"
              {...form.register("municipalRegistration")}
            />
          </Field>
        </div>

        <Field label="Razão social">
          <Input
            placeholder="Lucida Tecnologia LTDA"
            autoComplete="organization"
            {...form.register("legalName")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
          <Field label="CEP" hint={cepLoading ? "Buscando..." : undefined}>
            <Controller
              control={form.control}
              name="addressPostalCode"
              render={({ field }) => (
                <Input
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatCep(e.target.value))}
                  onBlur={(e) => {
                    field.onBlur();
                    void handleCepBlur(e.target.value);
                  }}
                />
              )}
            />
            {form.formState.errors.addressPostalCode && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.addressPostalCode.message}
              </p>
            )}
          </Field>
          <Field label="Logradouro">
            <Input
              autoComplete="address-line1"
              {...form.register("addressStreet")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
          <Field label="Número">
            <Input placeholder="123" {...form.register("addressNumber")} />
          </Field>
          <Field label="Complemento" hint="Opcional">
            <Input
              autoComplete="address-line2"
              {...form.register("addressComplement")}
            />
          </Field>
        </div>

        <Field label="Bairro">
          <Input
            autoComplete="address-level3"
            {...form.register("addressDistrict")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <Field label="Cidade">
            <Input
              autoComplete="address-level2"
              {...form.register("addressCityName")}
            />
          </Field>
          <Field label="UF">
            <Input
              maxLength={2}
              placeholder="SP"
              autoComplete="address-level1"
              {...form.register("addressStateUf")}
            />
            {form.formState.errors.addressStateUf && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.addressStateUf.message}
              </p>
            )}
          </Field>
        </div>

        <Field
          label="Código IBGE da cidade"
          hint="Preenchido pelo CEP — exigido na nota fiscal"
        >
          <Input
            inputMode="numeric"
            className="font-mono text-sm"
            {...form.register("addressCityCode")}
          />
          {form.formState.errors.addressCityCode && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.addressCityCode.message}
            </p>
          )}
        </Field>

        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          {saved && !form.formState.isDirty && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
              <Check className="size-4" />
              Salvo
            </span>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
