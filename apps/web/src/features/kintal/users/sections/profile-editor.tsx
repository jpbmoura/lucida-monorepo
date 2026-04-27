"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACQUISITION_CHANNELS,
  INSTITUTION_TYPES,
  STATE_UFS,
  STUDENTS_RANGES,
  TEACHING_YEARS,
  type Option,
} from "@/features/app/settings/profile-options";
import { updateKintalUserAction } from "../data";
import type { KintalUserDetail } from "../types";

const schema = z.object({
  name: z.string().max(200).optional(),
  whatsapp: z.string().max(40).optional(),
  institutionType: z.string().optional(),
  stateUf: z.string().optional(),
  studentsRange: z.string().optional(),
  teachingYears: z.string().optional(),
  acquisitionChannel: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProfileEditorProps {
  user: KintalUserDetail;
}

export function ProfileEditor({ user }: ProfileEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name ?? "",
      whatsapp: user.whatsapp ?? "",
      institutionType: user.institutionType ?? "",
      stateUf: user.stateUf ?? "",
      studentsRange: user.studentsRange ?? "",
      teachingYears: user.teachingYears ?? "",
      acquisitionChannel: user.acquisitionChannel ?? "",
    },
  });

  function handleSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);

    // Mandar string vazia como null pra a server action limpar o campo.
    const patch = {
      name: values.name?.trim() || undefined,
      whatsapp: normalize(values.whatsapp),
      institutionType: normalize(values.institutionType),
      stateUf: normalize(values.stateUf),
      studentsRange: normalize(values.studentsRange),
      teachingYears: normalize(values.teachingYears),
      acquisitionChannel: normalize(values.acquisitionChannel),
    };

    startTransition(async () => {
      const result = await updateKintalUserAction(user.id, patch);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      form.reset(values);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <Section
        title="Identidade"
        description="O e-mail é a identidade da conta — não pode ser alterado por aqui."
      >
        <Field label="E-mail" hint="Somente leitura">
          <Input
            readOnly
            value={user.email}
            className="cursor-not-allowed bg-gray-50 text-gray-600"
          />
        </Field>
        <Field label="Nome">
          <Input
            placeholder="Nome completo"
            {...form.register("name")}
            disabled={isPending}
          />
        </Field>
        <Field label="WhatsApp" hint="Opcional">
          <Input
            placeholder="+55 11 99999-0000"
            inputMode="tel"
            {...form.register("whatsapp")}
            disabled={isPending}
          />
        </Field>
      </Section>

      <Section
        title="Contexto de uso"
        description="Dados que ajudam a entender o perfil do cliente."
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
                placeholder="Selecione"
                disabled={isPending}
              />
            )}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  disabled={isPending}
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
                  disabled={isPending}
                />
              )}
            />
          </Field>
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
                  disabled={isPending}
                />
              )}
            />
          </Field>
          <Field label="Como conheceu">
            <Controller
              control={form.control}
              name="acquisitionChannel"
              render={({ field }) => (
                <NativeSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={ACQUISITION_CHANNELS}
                  placeholder="Selecione"
                  disabled={isPending}
                />
              )}
            />
          </Field>
        </div>
      </Section>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
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
          disabled={isPending || !form.formState.isDirty}
          className="hover:!bg-gray-800"
        >
          {isPending ? (
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

function normalize(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-ink transition-colors",
        "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
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
