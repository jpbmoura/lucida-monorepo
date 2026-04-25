"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildMailtoUrl } from "@/lib/support-contacts";

// Tipo da instituição é open-ended o bastante pra cobrir os principais
// segmentos que entram em contato (escolas K-12, cursinhos, ensino superior,
// programas corporativos). Adiciona "outro" pra não bloquear quem não cabe.
const TYPES = [
  { value: "escola", label: "Escola" },
  { value: "cursinho", label: "Cursinho" },
  { value: "universidade", label: "Universidade" },
  { value: "empresa", label: "Empresa / treinamento corporativo" },
  { value: "outro", label: "Outro" },
] as const;

const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, {
    message: "Use DDD + número (10 ou 11 dígitos).",
  });

const schema = z.object({
  name: z.string().trim().min(2, "Diga seu nome."),
  institution: z.string().trim().min(2, "Diga o nome da instituição."),
  type: z.enum(TYPES.map((t) => t.value) as [string, ...string[]]),
  email: z.string().trim().email("E-mail inválido."),
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .min(10, "Conta um pouco mais — pelo menos 10 caracteres.")
    .max(2000, "Máximo de 2.000 caracteres."),
});

type FormValues = z.input<typeof schema>;

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function formatBRPhone(raw: string) {
  const d = digitsOnly(raw).slice(0, 11);
  const ddd = d.slice(0, 2);
  const isMobile = d.length >= 11;
  const part1 = d.slice(2, isMobile ? 7 : 6);
  const part2 = d.slice(isMobile ? 7 : 6);

  if (!ddd) return "";
  if (d.length <= 2) return `(${ddd}`;
  if (!part1) return `(${ddd})`;
  if (!part2) return `(${ddd}) ${part1}`;
  return `(${ddd}) ${part1}-${part2}`;
}

/**
 * Formulário público de contato institucional. Não chama backend autenticado:
 * monta um mailto com a mensagem estruturada e abre o cliente de e-mail do
 * usuário. Pragmatico — evita criar endpoint público de formulário só pra
 * marketing, e mantém o trail no inbox de quem responde (contato@lucidaexam.com).
 */
export function InstitutionalContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      institution: "",
      type: "escola",
      email: "",
      phone: "",
      message: "",
    },
    mode: "onBlur",
  });

  function handleSubmit(values: FormValues) {
    setSubmitting(true);
    const subject = `Contato institucional — ${values.institution}`;
    const body = [
      `Nome: ${values.name}`,
      `Instituição: ${values.institution}`,
      `Tipo: ${TYPES.find((t) => t.value === values.type)?.label ?? values.type}`,
      `E-mail: ${values.email}`,
      `Telefone: ${values.phone}`,
      "",
      "Mensagem:",
      values.message,
    ].join("\n");

    const mailto = `${buildMailtoUrl(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    setTimeout(() => {
      setSent(true);
      setSubmitting(false);
    }, 600);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <div>
          <h3 className="text-lg font-medium text-ink">Quase lá</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-600">
            Abrimos seu cliente de e-mail com a mensagem pronta. É só revisar
            e enviar — a gente responde em até um dia útil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            form.reset();
          }}
          className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-dark-01"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 md:p-7"
      noValidate
    >
      <header className="border-b border-gray-100 pb-4">
        <h2 className="text-base font-medium text-ink">
          Conta um pouco sobre a instituição
        </h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          A gente prepara uma proposta sob medida e responde rapidinho.
        </p>
      </header>

      <Field
        label="Seu nome"
        error={form.formState.errors.name?.message}
        htmlFor="ic-name"
      >
        <Input
          id="ic-name"
          autoComplete="name"
          placeholder="Maria da Silva"
          {...form.register("name")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label="Instituição"
          error={form.formState.errors.institution?.message}
          htmlFor="ic-inst"
        >
          <Input
            id="ic-inst"
            autoComplete="organization"
            placeholder="Colégio Exemplo"
            {...form.register("institution")}
          />
        </Field>

        <Field
          label="Tipo"
          error={form.formState.errors.type?.message}
          htmlFor="ic-type"
        >
          <select
            id="ic-type"
            {...form.register("type")}
            className={cn(
              "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink transition-colors",
              "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            )}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          label="E-mail"
          error={form.formState.errors.email?.message}
          htmlFor="ic-email"
        >
          <Input
            id="ic-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            {...form.register("email")}
          />
        </Field>

        <Field
          label="WhatsApp"
          error={form.formState.errors.phone?.message}
          htmlFor="ic-phone"
        >
          <Input
            id="ic-phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={form.watch("phone")}
            onChange={(e) =>
              form.setValue("phone", formatBRPhone(e.target.value), {
                shouldValidate: true,
              })
            }
          />
        </Field>
      </div>

      <Field
        label="Como podemos ajudar?"
        error={form.formState.errors.message?.message}
        htmlFor="ic-msg"
      >
        <Textarea
          id="ic-msg"
          rows={5}
          placeholder="Quantos professores e alunos? Quais matérias? Tem alguma demanda específica?"
          maxLength={2000}
          {...form.register("message")}
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Abrindo e-mail…
          </>
        ) : (
          <>
            Enviar mensagem
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
