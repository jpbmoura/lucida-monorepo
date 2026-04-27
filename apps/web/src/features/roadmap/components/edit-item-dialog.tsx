"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { updateRoadmapItemAction } from "../data";
import {
  PRODUCT_LABELS,
  ROADMAP_PRODUCTS,
  ROADMAP_STAGES,
  STAGE_LABELS,
  type RoadmapItemDto,
  type RoadmapProduct,
  type RoadmapStage,
} from "../types";

const schema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(1000).optional(),
  product: z.enum(ROADMAP_PRODUCTS),
  stage: z.enum(ROADMAP_STAGES),
  staffNote: z.string().max(500).optional(),
});

type FormInput = z.infer<typeof schema>;

interface EditItemDialogProps {
  item: RoadmapItemDto;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function EditItemDialog({
  item,
  open,
  onOpenChange,
}: EditItemDialogProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: item.title,
      description: item.description,
      product: item.product,
      stage: item.stage,
      staffNote: item.staffNote ?? "",
    },
  });

  function onSubmit(values: FormInput) {
    setServerError(null);
    startTransition(async () => {
      const trimmedNote = (values.staffNote ?? "").trim();
      const result = await updateRoadmapItemAction(item.id, {
        title: values.title,
        description: values.description,
        product: values.product as RoadmapProduct,
        stage: values.stage as RoadmapStage,
        // null limpa, undefined deixa como está. Aqui sempre mandamos —
        // string vazia → null pra apagar a nota.
        staffNote: trimmedNote.length === 0 ? null : trimmedNote,
      });
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const product = watch("product");
  const stage = watch("stage");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar item do roadmap</DialogTitle>
          <DialogDescription>
            Mudar produto, estágio ou conteúdo do card. Visível imediatamente
            para todos os usuários.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              autoComplete="off"
              disabled={isPending}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              rows={4}
              disabled={isPending}
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Produto</Label>
              <div className="flex gap-2">
                {ROADMAP_PRODUCTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setValue("product", p, { shouldDirty: true })
                    }
                    className={
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors " +
                      (product === p
                        ? "border-ink bg-ink text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
                    }
                  >
                    {PRODUCT_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-stage">Estágio</Label>
              <select
                id="edit-stage"
                value={stage}
                onChange={(e) =>
                  setValue("stage", e.target.value as RoadmapStage, {
                    shouldDirty: true,
                  })
                }
                disabled={isPending}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-ink focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
              >
                {ROADMAP_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-staff-note">Nota pública do time (opcional)</Label>
            <Textarea
              id="edit-staff-note"
              rows={2}
              placeholder="Ex.: motivo da recusa, link de issue, prazo estimado..."
              disabled={isPending}
              {...register("staffNote")}
            />
            <p className="text-xs text-gray-500">
              Aparece no card pra todos os usuários. Útil pra explicar uma
              decisão de produto.
            </p>
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
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
