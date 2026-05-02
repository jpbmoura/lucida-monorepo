"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "../types";
import { createExpenseAction } from "../data";

const schema = z.object({
  category: z.enum([
    EXPENSE_CATEGORIES[0]!,
    ...EXPENSE_CATEGORIES.slice(1),
  ]),
  description: z.string().min(1, "Descreva a despesa.").max(500),
  // O input é "R$ 199,90" → convertemos para centavos no submit.
  amountStr: z
    .string()
    .min(1, "Informe o valor.")
    .refine((s) => parseAmountToCents(s) !== null, {
      message: "Use o formato 199,90 ou 199.90.",
    }),
  occurredAt: z
    .string()
    .min(1, "Informe a data.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido."),
});

type FormInput = z.infer<typeof schema>;

interface ExpenseFormDialogProps {
  /** ISO YYYY-MM-DD pra default da data — o caller passa "hoje" do TZ
   *  do servidor pra evitar drift com a borda do dia. */
  defaultOccurredAt: string;
}

// Dialog pra lançar uma despesa manual. Categoria + descrição + valor +
// data. Stack visual igual ao add-staff-dialog. Após sucesso, fecha o
// dialog — a página rerenderiza via revalidatePath na server action.
export function ExpenseFormDialog({ defaultOccurredAt }: ExpenseFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "infrastructure",
      description: "",
      amountStr: "",
      occurredAt: defaultOccurredAt,
    },
  });

  function onSubmit(values: FormInput) {
    setServerError(null);
    const cents = parseAmountToCents(values.amountStr);
    if (cents === null) {
      setServerError("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await createExpenseAction({
        category: values.category as ExpenseCategory,
        description: values.description.trim(),
        amountCents: cents,
        occurredAt: new Date(values.occurredAt).toISOString(),
      });
      if (!result.ok) {
        setServerError(result.message ?? "Erro ao criar despesa.");
        return;
      }
      reset({
        category: "infrastructure",
        description: "",
        amountStr: "",
        occurredAt: defaultOccurredAt,
      });
      setOpen(false);
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="primary"
          size="md"
          className="shrink-0 hover:!bg-gray-800"
        >
          <Plus />
          Lançar despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
          <DialogDescription>
            Lança um custo da Lucida no período da data informada.
            Categorias “Taxa Stripe” e “Impostos” abatem o líquido; as demais
            só somam em gastos.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-category">Categoria</Label>
            <select
              id="expense-category"
              disabled={isPending}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gray-200"
              {...register("category")}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-description">Descrição</Label>
            <Input
              id="expense-description"
              autoComplete="off"
              placeholder="Ex: Railway · Maio/2026"
              aria-invalid={errors.description ? true : undefined}
              disabled={isPending}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="expense-amount">Valor (R$)</Label>
              <Input
                id="expense-amount"
                autoComplete="off"
                inputMode="decimal"
                placeholder="199,90"
                aria-invalid={errors.amountStr ? true : undefined}
                disabled={isPending}
                {...register("amountStr")}
              />
              {errors.amountStr && (
                <p className="text-xs text-red-600">{errors.amountStr.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="expense-date">Data</Label>
              <Input
                id="expense-date"
                type="date"
                aria-invalid={errors.occurredAt ? true : undefined}
                disabled={isPending}
                {...register("occurredAt")}
              />
              {errors.occurredAt && (
                <p className="text-xs text-red-600">{errors.occurredAt.message}</p>
              )}
            </div>
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
              variant="ghost"
              size="md"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isPending}
              className="hover:!bg-gray-800"
            >
              {isPending ? "Salvando..." : "Lançar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Converte "199,90" / "199.90" / "1.234,56" → centavos. Null se inválido. */
function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, "");
  if (!cleaned) return null;
  // Aceita só dígitos, ponto e vírgula.
  if (!/^[\d.,]+$/.test(cleaned)) return null;
  // Normaliza pra ponto decimal: se tem vírgula, ela é o separador decimal
  // (formato BR), e pontos são milhares.
  const hasComma = cleaned.includes(",");
  const normalized = hasComma
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}
