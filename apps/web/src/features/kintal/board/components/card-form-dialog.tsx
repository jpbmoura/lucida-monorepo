"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildDisplayUser } from "@/lib/user-display";
import type { StaffMember } from "@/features/kintal/acessos/types";
import {
  CARD_PRIORITIES,
  CARD_STATUSES,
  CARD_TAG_LIST,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TAG_COLOR_CLASSES,
  type CardPriority,
  type CardStatus,
  type KanbanCard,
} from "../types";
import {
  createCardAction,
  deleteCardAction,
  updateCardAction,
} from "../data";

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  /**
   * Pré-seleção de status quando criando do botão "+ adicionar" de uma
   * coluna específica. Ignorado em modo edit.
   */
  presetStatus?: CardStatus;
  /** Quando presente, o dialog abre em modo edição. */
  card?: KanbanCard;
}

interface FormState {
  title: string;
  description: string;
  status: CardStatus;
  priority: CardPriority;
  assigneeId: string;
  tags: string[];
}

/**
 * Dialog único pra create + edit. Modo é derivado da prop `card` (presente
 * = edit, ausente = create). Reusar reduz duplicação — formato dos campos
 * é o mesmo nos dois fluxos.
 */
export function CardFormDialog({
  open,
  onOpenChange,
  staff,
  presetStatus,
  card,
}: CardFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = Boolean(card);

  const [form, setForm] = useState<FormState>(() => initialState(card, presetStatus));

  // Reset toda vez que abrir/fechar OU mudar o card (caso o user navegue
  // de um card pra outro via drag clicks consecutivos).
  useEffect(() => {
    if (open) {
      setForm(initialState(card, presetStatus));
      setError(null);
      setConfirmingDelete(false);
    }
  }, [open, card, presetStatus]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function toggleTag(tagId: string) {
    setForm((s) => ({
      ...s,
      tags: s.tags.includes(tagId)
        ? s.tags.filter((t) => t !== tagId)
        : [...s.tags, tagId],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setError("Título não pode ficar vazio.");
      return;
    }

    startTransition(async () => {
      if (isEdit && card) {
        const result = await updateCardAction(card.id, {
          title: trimmedTitle,
          description: form.description,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          tags: form.tags,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else {
        const result = await createCardAction({
          title: trimmedTitle,
          description: form.description,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          tags: form.tags,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!card) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteCardAction(card.id);
      if (!result.ok) {
        setError(result.message);
        setConfirmingDelete(false);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar card" : "Novo card"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os campos. Mover entre colunas é via drag & drop."
              : "Cria uma demanda no board interno."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-title">Título</Label>
            <Input
              id="card-title"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              maxLength={200}
              placeholder="Ex: Investigar erro 502 no scanner"
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="card-description">Descrição</Label>
            <Textarea
              id="card-description"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="Contexto, links, repro, qualquer detalhe útil..."
              disabled={isPending}
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label>Coluna inicial</Label>
              <NativeSelect
                value={form.status}
                onChange={(v) => patch("status", v as CardStatus)}
                options={CARD_STATUSES.map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                }))}
                disabled={isPending}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Prioridade</Label>
              <NativeSelect
                value={form.priority}
                onChange={(v) => patch("priority", v as CardPriority)}
                options={CARD_PRIORITIES.map((p) => ({
                  value: p,
                  label: PRIORITY_LABELS[p],
                }))}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Responsável</Label>
              <NativeSelect
                value={form.assigneeId}
                onChange={(v) => patch("assigneeId", v)}
                options={[
                  { value: "", label: "— Sem responsável —" },
                  ...staff.map((m) => ({
                    value: m.id,
                    label: buildDisplayUser({
                      name: m.name,
                      email: m.email,
                      fallback: "email",
                    }).name,
                  })),
                ]}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5">
              {CARD_TAG_LIST.map((tag) => {
                const selected = form.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    disabled={isPending}
                    className={cn(
                      "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? TAG_COLOR_CLASSES[tag.color]
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <DialogFooter className="!justify-between">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  confirmingDelete
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "text-gray-500 hover:bg-gray-100 hover:text-red-700",
                )}
              >
                <Trash2 className="size-3.5" />
                {confirmingDelete ? "Confirmar exclusão" : "Excluir"}
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => onOpenChange(false)}
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
                {isPending
                  ? "Salvando..."
                  : isEdit
                    ? "Salvar alterações"
                    : "Criar card"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialState(
  card: KanbanCard | undefined,
  presetStatus: CardStatus | undefined,
): FormState {
  return {
    title: card?.title ?? "",
    description: card?.description ?? "",
    status: card?.status ?? presetStatus ?? "backlog",
    priority: card?.priority ?? "medium",
    assigneeId: card?.assigneeId ?? "",
    tags: card?.tags ?? [],
  };
}

function NativeSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
