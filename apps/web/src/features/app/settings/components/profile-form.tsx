"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { formatTaxId } from "@/lib/tax-id";
import { formatCep, lookupCep } from "@/lib/viacep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { UserProfileDTO } from "../data";
import {
  ACQUISITION_CHANNELS,
  GENDERS,
  INSTITUTION_TYPES,
  STATE_UFS,
  STUDENTS_RANGES,
  SUBJECTS,
  TEACHING_LEVELS,
  TEACHING_YEARS,
  type Option,
} from "../profile-options";

/**
 * CPF (11 dígitos) ou CNPJ (14). Aceita máscara comum (`.`, `-`, `/`) e
 * normaliza pra dígitos antes de salvar — o backend exige só dígitos.
 * Vazio é permitido aqui (campo opcional no perfil); a obrigatoriedade
 * acontece só no momento do checkout (Stripe ou PIX).
 */
const taxIdField = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 0 || digits.length === 11 || digits.length === 14;
    },
    { message: "CPF (11 dígitos) ou CNPJ (14 dígitos)." },
  );

/**
 * Dados fiscais — todos opcionais aqui (settings é livre). A obrigatoriedade
 * acontece no momento do checkout: o backend devolve 422 se taxId é CNPJ
 * e algum desses campos está vazio. UI explica isso na descrição da seção.
 *
 * `addressCityCode` aceita string vazia ou 7 dígitos (IBGE). Se o user
 * digitar parcial, o submit vai falhar — bom feedback.
 */
const optionalIbgeField = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\d{7}$/.test(v),
    "Código IBGE precisa ter 7 dígitos.",
  );

const optionalUfField = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^[A-Za-z]{2}$/.test(v),
    "UF: 2 letras (ex: SP).",
  );

const optionalCepField = z
  .string()
  .optional()
  .refine(
    (v) => !v || v.replace(/\D/g, "").length === 8,
    "CEP precisa ter 8 dígitos.",
  );

const profileFormSchema = z.object({
  name: z.string().max(120).optional(),
  whatsapp: z.string().max(40).optional(),
  taxId: taxIdField,
  institutionType: z.string().optional(),
  gender: z.string().optional(),
  teachingLevels: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  acquisitionChannel: z.string().optional(),
  stateUf: z.string().optional(),
  studentsRange: z.string().optional(),
  teachingYears: z.string().optional(),

  // Dados fiscais PJ — opcionais aqui, exigidos no checkout pra CNPJ.
  legalName: z.string().max(200).optional(),
  municipalRegistration: z.string().max(40).optional(),
  addressPostalCode: optionalCepField,
  addressStreet: z.string().max(200).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(120).optional(),
  addressDistrict: z.string().max(120).optional(),
  addressCityCode: optionalIbgeField,
  addressCityName: z.string().max(120).optional(),
  addressStateUf: optionalUfField,
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ profile }: { profile: UserProfileDTO }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name ?? "",
      whatsapp: profile.whatsapp ?? "",
      taxId: formatTaxId(profile.taxId ?? ""),
      institutionType: profile.institutionType ?? "",
      gender: profile.gender ?? "",
      teachingLevels: profile.teachingLevels ?? [],
      subjects: profile.subjects ?? [],
      acquisitionChannel: profile.acquisitionChannel ?? "",
      stateUf: profile.stateUf ?? "",
      studentsRange: profile.studentsRange ?? "",
      teachingYears: profile.teachingYears ?? "",
      legalName: profile.legalName ?? "",
      municipalRegistration: profile.municipalRegistration ?? "",
      addressPostalCode: profile.addressPostalCode
        ? formatCep(profile.addressPostalCode)
        : "",
      addressStreet: profile.addressStreet ?? "",
      addressNumber: profile.addressNumber ?? "",
      addressComplement: profile.addressComplement ?? "",
      addressDistrict: profile.addressDistrict ?? "",
      addressCityCode: profile.addressCityCode ?? "",
      addressCityName: profile.addressCityName ?? "",
      addressStateUf: profile.addressStateUf ?? "",
    },
  });

  const [cepLoading, setCepLoading] = useState(false);

  async function handleCepBlur(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const result = await lookupCep(digits);
      if (!result) return;
      const current = form.getValues();
      if (!current.addressStreet)
        form.setValue("addressStreet", result.logradouro, { shouldDirty: true });
      if (!current.addressDistrict)
        form.setValue("addressDistrict", result.bairro, { shouldDirty: true });
      if (!current.addressCityName)
        form.setValue("addressCityName", result.localidade, { shouldDirty: true });
      if (!current.addressStateUf)
        form.setValue("addressStateUf", result.uf, { shouldDirty: true });
      if (!current.addressCityCode)
        form.setValue("addressCityCode", result.ibge, { shouldDirty: true });
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSaved(false);

    // BetterAuth não aceita strings vazias como update — mandamos só o que
    // tem conteúdo (ou arrays que podem esvaziar de propósito).
    const payload: Record<string, unknown> = {};
    if (values.name && values.name.trim()) payload.name = values.name.trim();
    if (values.whatsapp !== undefined) payload.whatsapp = values.whatsapp.trim();
    if (values.taxId !== undefined) payload.taxId = values.taxId.replace(/\D/g, "");
    if (values.institutionType !== undefined)
      payload.institutionType = values.institutionType;
    if (values.gender !== undefined) payload.gender = values.gender;
    if (values.teachingLevels !== undefined)
      payload.teachingLevels = values.teachingLevels;
    if (values.subjects !== undefined) payload.subjects = values.subjects;
    if (values.acquisitionChannel !== undefined)
      payload.acquisitionChannel = values.acquisitionChannel;
    if (values.stateUf !== undefined) payload.stateUf = values.stateUf;
    if (values.studentsRange !== undefined)
      payload.studentsRange = values.studentsRange;
    if (values.teachingYears !== undefined)
      payload.teachingYears = values.teachingYears;

    // Dados fiscais — manda só dígitos pro CEP, restante trim. Strings
    // vazias são enviadas pra permitir limpar campos previamente preenchidos.
    if (values.legalName !== undefined)
      payload.legalName = values.legalName.trim();
    if (values.municipalRegistration !== undefined)
      payload.municipalRegistration = values.municipalRegistration.trim();
    if (values.addressPostalCode !== undefined)
      payload.addressPostalCode = values.addressPostalCode.replace(/\D/g, "");
    if (values.addressStreet !== undefined)
      payload.addressStreet = values.addressStreet.trim();
    if (values.addressNumber !== undefined)
      payload.addressNumber = values.addressNumber.trim();
    if (values.addressComplement !== undefined)
      payload.addressComplement = values.addressComplement.trim();
    if (values.addressDistrict !== undefined)
      payload.addressDistrict = values.addressDistrict.trim();
    if (values.addressCityCode !== undefined)
      payload.addressCityCode = values.addressCityCode;
    if (values.addressCityName !== undefined)
      payload.addressCityName = values.addressCityName.trim();
    if (values.addressStateUf !== undefined)
      payload.addressStateUf = values.addressStateUf.toUpperCase();
    // Country fixo "BR" enquanto não houver tomador estrangeiro.
    if (values.addressPostalCode || values.legalName) payload.addressCountry = "BR";

    const res = await authClient.updateUser(payload);
    if (res.error) {
      setServerError(res.error.message ?? "Não foi possível salvar.");
      return;
    }

    form.reset(values);
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-8"
      noValidate
    >
      <Section
        title="Identidade"
        description="O email identifica sua conta e não pode ser alterado por aqui."
      >
        <Field label="Email" hint="Somente leitura">
          <Input
            readOnly
            value={profile.email}
            className="cursor-not-allowed bg-gray-50 text-gray-600"
          />
        </Field>
        <Field label="Nome">
          <Input
            placeholder="Seu nome completo"
            autoComplete="name"
            {...form.register("name")}
          />
        </Field>
        <Field label="WhatsApp" hint="Opcional — usado pra suporte e avisos importantes">
          <Input
            placeholder="+55 11 99999-0000"
            inputMode="tel"
            autoComplete="tel"
            {...form.register("whatsapp")}
          />
        </Field>
        <Field
          label="CPF ou CNPJ"
          hint="Obrigatório no momento de qualquer pagamento (cartão ou PIX)"
        >
          <Controller
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <Input
                placeholder="000.000.000-00"
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
      </Section>

      <Section
        title="Dados fiscais (PJ)"
        description="Necessário para emissão de nota fiscal quando você é pessoa jurídica (CNPJ). PF (CPF) pode deixar em branco."
      >
        <Field label="Razão social">
          <Input
            placeholder="Lucida Tecnologia LTDA"
            autoComplete="organization"
            {...form.register("legalName")}
          />
          {form.formState.errors.legalName && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.legalName.message}
            </p>
          )}
        </Field>
        <Field
          label="Inscrição Municipal"
          hint="Opcional — exigida em alguns municípios"
        >
          <Input
            placeholder="000000000"
            inputMode="numeric"
            {...form.register("municipalRegistration")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_2fr]">
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
              placeholder="Rua, avenida..."
              autoComplete="address-line1"
              {...form.register("addressStreet")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_2fr]">
          <Field label="Número">
            <Input placeholder="123" {...form.register("addressNumber")} />
          </Field>
          <Field label="Complemento" hint="Opcional">
            <Input
              placeholder="Sala 12, Bloco A..."
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[2fr_1fr]">
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
      </Section>

      <Section
        title="Sobre o que você ensina"
        description="Nos ajuda a ajustar prompts e conteúdos ao seu contexto."
      >
        <Field label="Tipo de instituição">
          <Controller
            control={form.control}
            name="institutionType"
            render={({ field }) => (
              <NativeSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                options={INSTITUTION_TYPES}
                placeholder="Selecione uma opção"
              />
            )}
          />
        </Field>
        <Field label="Nível(is) de ensino" hint="Selecione todos que se aplicam">
          <Controller
            control={form.control}
            name="teachingLevels"
            render={({ field }) => (
              <ChipsMulti
                values={field.value ?? []}
                onChange={field.onChange}
                options={TEACHING_LEVELS}
              />
            )}
          />
        </Field>
        <Field label="Disciplina(s)" hint="Selecione todas que você leciona">
          <Controller
            control={form.control}
            name="subjects"
            render={({ field }) => (
              <ChipsMulti
                values={field.value ?? []}
                onChange={field.onChange}
                options={SUBJECTS}
              />
            )}
          />
        </Field>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Anos lecionando">
            <Controller
              control={form.control}
              name="teachingYears"
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={TEACHING_YEARS}
                  placeholder="Selecione"
                />
              )}
            />
          </Field>
          <Field label="Tamanho das turmas">
            <Controller
              control={form.control}
              name="studentsRange"
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={STUDENTS_RANGES}
                  placeholder="Selecione"
                />
              )}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Sobre você"
        description="Dados opcionais — ajudam a gente a entender melhor quem usa o Lucida."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Estado">
            <Controller
              control={form.control}
              name="stateUf"
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={STATE_UFS}
                  placeholder="Selecione"
                />
              )}
            />
          </Field>
          <Field label="Gênero">
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={GENDERS}
                  placeholder="Prefiro não dizer"
                />
              )}
            />
          </Field>
        </div>
        <Field label="Como você conheceu o Lucida?">
          <Controller
            control={form.control}
            name="acquisitionChannel"
            render={({ field }) => (
              <NativeSelect
                value={field.value ?? ""}
                onChange={field.onChange}
                options={ACQUISITION_CHANNELS}
                placeholder="Selecione"
              />
            )}
          />
        </Field>
      </Section>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-end gap-3 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        {saved && !form.formState.isDirty && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <Check className="size-4" />
            Alterações salvas
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
            "Salvar alterações"
          )}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-7">
      <header className="mb-5 border-b border-gray-100 pb-4">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
      </header>
      <div className="flex flex-col gap-5">{children}</div>
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

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink transition-colors",
        "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
        value === "" && "text-gray-400",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="text-ink">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ChipsMulti({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: Option[];
}) {
  function toggle(slug: string) {
    if (values.includes(slug)) {
      onChange(values.filter((v) => v !== slug));
    } else {
      onChange([...values, slug]);
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-ink",
            )}
          >
            {selected && <Check className="size-3" strokeWidth={3} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

