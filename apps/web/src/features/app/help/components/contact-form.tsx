"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Categorias compartilhadas com o backend (support-controller.ts).
export const CONTACT_CATEGORIES = [
  "duvida",
  "problema",
  "sugestao",
  "billing",
  "outro",
  "duvida_admin",
  "billing_institucional",
  "gestao_professores",
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface ContactCategoryOption {
  value: ContactCategory;
  label: string;
}

const DEFAULT_CATEGORIES: ContactCategoryOption[] = [
  { value: "duvida", label: "Dúvida de uso" },
  { value: "problema", label: "Problema técnico" },
  { value: "sugestao", label: "Sugestão / feature request" },
  { value: "billing", label: "Billing / pagamento" },
  { value: "outro", label: "Outro" },
];

// Schema usa `z.string()` pra categoria porque o enum real vive no action
// (compartilhado com backend). Aqui confiamos que `categories` prop contém
// só valores válidos. Valida min(1) pra não deixar passar vazio.
const schema = z.object({
  category: z.string().min(1),
  subject: z
    .string()
    .trim()
    .min(3, "Dê um assunto com ao menos 3 caracteres.")
    .max(160, "Máximo de 160 caracteres."),
  message: z
    .string()
    .trim()
    .min(10, "Conta um pouco mais — pelo menos 10 caracteres.")
    .max(4000, "Máximo de 4.000 caracteres."),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  userName: string;
  userEmail: string;
  /**
   * Categorias mostradas no select. Default: as 5 do /app. O /analytics/ajuda
   * passa o conjunto institucional. Backend aceita qualquer uma do enum
   * global — ver `CONTACT_CATEGORIES` no actions.ts.
   */
  categories?: ContactCategoryOption[];
}

export function ContactForm({
  userName,
  userEmail,
  categories = DEFAULT_CATEGORIES,
}: ContactFormProps) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultCategory = categories[0]?.value ?? "outro";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: defaultCategory,
      subject: "",
      message: "",
    },
  });

  const messageValue = form.watch("message") ?? "";

  async function handleSubmit(values: FormValues) {
    setServerError(null);
    try {
      // Fetch direto na API — cookies da sessão BetterAuth vão automático
      // (mesma origem via Next rewrite). Antes era Server Action mas o
      // proxy adicionava uma camada de erro opaca em prod (500 sem stack).
      const res = await fetch("/v1/support/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; code?: string }
          | null;
        setServerError(
          body?.message ?? "Não conseguimos enviar sua mensagem.",
        );
        return;
      }
      setSent(true);
      form.reset({ category: defaultCategory, subject: "", message: "" });
    } catch (err) {
      setServerError(
        (err as Error).message ??
          "Falha de conexão. Tente novamente em instantes.",
      );
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <div>
          <h3 className="text-lg font-medium text-ink">Mensagem enviada</h3>
          <p className="mt-1 max-w-sm text-[13px] text-gray-600">
            A gente responde pelo email <strong>{userEmail}</strong> em horário
            comercial. Se for urgente, fale no WhatsApp ao lado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSent(false)}
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
        <h2 className="text-base font-medium text-ink">Envie uma mensagem</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Assinando como <strong>{userName}</strong> — resposta chega em{" "}
          <strong>{userEmail}</strong>.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-category">Categoria</Label>
        <select
          id="contact-category"
          {...form.register("category")}
          className={cn(
            "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-ink transition-colors",
            "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
          )}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-subject">Assunto</Label>
        <Input
          id="contact-subject"
          placeholder="Ex: Como ajusto o peso de uma questão?"
          maxLength={160}
          aria-invalid={form.formState.errors.subject ? true : undefined}
          {...form.register("subject")}
        />
        {form.formState.errors.subject && (
          <p className="text-xs text-red-600">
            {form.formState.errors.subject.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="contact-message">Mensagem</Label>
          <span className="text-[11px] tabular-nums text-gray-400">
            {messageValue.length}/4000
          </span>
        </div>
        <Textarea
          id="contact-message"
          rows={8}
          placeholder="Descreva o que está acontecendo com o máximo de contexto possível — passos pra reproduzir, o que você esperava, o que aconteceu."
          maxLength={4000}
          aria-invalid={form.formState.errors.message ? true : undefined}
          {...form.register("message")}
        />
        {form.formState.errors.message && (
          <p className="text-xs text-red-600">
            {form.formState.errors.message.message}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" strokeWidth={2.5} />
              Enviar mensagem
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
