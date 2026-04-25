"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
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

const profileFormSchema = z.object({
  name: z.string().max(120).optional(),
  whatsapp: z.string().max(40).optional(),
  institutionType: z.string().optional(),
  gender: z.string().optional(),
  teachingLevels: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  acquisitionChannel: z.string().optional(),
  stateUf: z.string().optional(),
  studentsRange: z.string().optional(),
  teachingYears: z.string().optional(),
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
      institutionType: profile.institutionType ?? "",
      gender: profile.gender ?? "",
      teachingLevels: profile.teachingLevels ?? [],
      subjects: profile.subjects ?? [],
      acquisitionChannel: profile.acquisitionChannel ?? "",
      stateUf: profile.stateUf ?? "",
      studentsRange: profile.studentsRange ?? "",
      teachingYears: profile.teachingYears ?? "",
    },
  });

  async function handleSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSaved(false);

    // BetterAuth não aceita strings vazias como update — mandamos só o que
    // tem conteúdo (ou arrays que podem esvaziar de propósito).
    const payload: Record<string, unknown> = {};
    if (values.name && values.name.trim()) payload.name = values.name.trim();
    if (values.whatsapp !== undefined) payload.whatsapp = values.whatsapp.trim();
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
