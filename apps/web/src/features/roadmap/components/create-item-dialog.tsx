"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { createRoadmapItemAction } from "../data";
import {
  PRODUCT_LABELS,
  ROADMAP_PRODUCTS,
  STAFF_CREATABLE_STAGES,
  STAGE_LABELS,
  type RoadmapProduct,
  type RoadmapStage,
} from "../types";

const schema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(1000).optional(),
  product: z.enum(ROADMAP_PRODUCTS),
  stage: z.enum(STAFF_CREATABLE_STAGES as unknown as [string, ...string[]]),
  staffNote: z.string().max(500).optional(),
});

type FormInput = z.infer<typeof schema>;

// Botão + dialog que só aparece pra staff. Cria um item curado direto no
// kanban (não passa pela coluna de sugestões).
export function CreateItemDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { product: "exam", stage: "planned" },
  });

  function onSubmit(values: FormInput) {
    setServerError(null);
    startTransition(async () => {
      const trimmedNote = (values.staffNote ?? "").trim();
      const result = await createRoadmapItemAction({
        title: values.title,
        description: values.description,
        product: values.product as RoadmapProduct,
        stage: values.stage as RoadmapStage,
        staffNote: trimmedNote.length === 0 ? null : trimmedNote,
      });
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      reset({ product: "exam", stage: "planned" });
      setOpen(false);
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset({ product: "exam", stage: "planned" });
      setServerError(null);
    }
  }

  const product = watch("product");
  const stage = watch("stage");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="md" className="shrink-0">
          <Plus />
          Adicionar ao roadmap
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar ao roadmap</DialogTitle>
          <DialogDescription>
            Cria um item direto no kanban (não passa pela coluna de sugestões).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-title">Título</Label>
            <Input
              id="create-title"
              autoComplete="off"
              disabled={isPending}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-description">Descrição</Label>
            <Textarea
              id="create-description"
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
              <Label htmlFor="create-stage">Estágio</Label>
              <select
                id="create-stage"
                value={stage}
                onChange={(e) =>
                  setValue("stage", e.target.value as RoadmapStage, {
                    shouldDirty: true,
                  })
                }
                disabled={isPending}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-ink focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
              >
                {STAFF_CREATABLE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-staff-note">Nota pública do time (opcional)</Label>
            <Textarea
              id="create-staff-note"
              rows={2}
              disabled={isPending}
              {...register("staffNote")}
            />
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
            <Button type="submit" variant="primary" size="md" disabled={isPending}>
              {isPending ? "Criando..." : "Criar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
