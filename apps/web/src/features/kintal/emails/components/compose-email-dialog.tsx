"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  searchRecipientsAction,
  sendNewEmailAction,
  type RecipientSuggestion,
} from "../actions";

const SCHEMA = z.object({
  customerEmail: z
    .string()
    .trim()
    .min(1, "Email do destinatário é obrigatório.")
    .email("Email inválido."),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  subject: z
    .string()
    .trim()
    .min(1, "Assunto é obrigatório.")
    .max(200, "Máximo 200 caracteres."),
  bodyText: z
    .string()
    .trim()
    .min(1, "Mensagem não pode ficar vazia.")
    .max(10_000),
});

type FormValues = z.infer<typeof SCHEMA>;

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function ComposeEmailDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA),
    defaultValues: {
      customerEmail: "",
      customerName: "",
      subject: "",
      bodyText: "",
    },
  });

  function close(open: boolean) {
    if (!open) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(open);
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await sendNewEmailAction({
      customerEmail: values.customerEmail.toLowerCase(),
      customerName: values.customerName || null,
      subject: values.subject,
      bodyText: values.bodyText,
    });
    if (!res.ok) {
      setServerError(res.message);
      return;
    }
    form.reset();
    onOpenChange(false);
    router.push("/kintal/emails?box=outbox");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo email</DialogTitle>
          <DialogDescription>
            Inicia uma nova conversa pelo Resend. Se o cliente responder,
            cai aqui na caixa de entrada na mesma thread.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <RecipientField
            value={form.watch("customerEmail")}
            error={form.formState.errors.customerEmail?.message}
            onSelect={(s) => {
              form.setValue("customerEmail", s.email, {
                shouldValidate: true,
              });
              if (!form.getValues("customerName") && s.name) {
                form.setValue("customerName", s.name);
              }
            }}
            onChange={(value) =>
              form.setValue("customerEmail", value, {
                shouldValidate: true,
              })
            }
          />

          <Field
            label="Assunto"
            error={form.formState.errors.subject?.message}
          >
            <Input
              placeholder="Sobre sua conta na Lucida"
              autoComplete="off"
              maxLength={200}
              {...form.register("subject")}
            />
          </Field>

          <Field
            label="Mensagem"
            error={form.formState.errors.bodyText?.message}
          >
            <Textarea
              rows={8}
              placeholder="Escreva o email…"
              {...form.register("bodyText")}
            />
          </Field>

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
                  Enviando...
                </>
              ) : (
                "Enviar email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recipient field (autocomplete inline) ─────────────────────────

interface RecipientFieldProps {
  value: string;
  error?: string;
  onChange(value: string): void;
  onSelect(suggestion: RecipientSuggestion): void;
}

function RecipientField({
  value,
  error,
  onChange,
  onSelect,
}: RecipientFieldProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const [searching, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Debounce server-side: 250ms desde a última digitação.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        const res = await searchRecipientsAction(trimmed);
        setSuggestions(res);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [value]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
      <Label>Para</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="Digite nome ou email do destinatário"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            aria-label="Limpar"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => {
              onChange("");
              setSuggestions([]);
            }}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || searching) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-soft">
          {searching && suggestions.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-500">Buscando…</div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-gray-50",
              )}
            >
              <span className="text-sm font-medium text-ink">
                {s.name ?? s.email}
              </span>
              {s.name && (
                <span className="text-[11px] text-gray-500">{s.email}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Sugere usuários cadastrados. Aceita também email livre se ninguém
        aparecer.
      </p>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

// ─── Field wrapper ──────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
