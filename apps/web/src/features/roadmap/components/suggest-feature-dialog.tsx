"use client";

import Link from "next/link";
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
import { suggestFeatureAction } from "../data";
import {
  PRODUCT_LABELS,
  ROADMAP_PRODUCTS,
  type RoadmapProduct,
} from "../types";

const schema = z.object({
  title: z.string().min(4, "Título precisa de no mínimo 4 caracteres.").max(120),
  description: z.string().max(1000).optional(),
  product: z.enum(ROADMAP_PRODUCTS),
});

type FormInput = z.infer<typeof schema>;

interface SuggestFeatureDialogProps {
  isAuthenticated: boolean;
}

export function SuggestFeatureDialog({
  isAuthenticated,
}: SuggestFeatureDialogProps) {
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
    defaultValues: { product: "exam" },
  });

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="md">
        <Link href={`/sign-in?next=${encodeURIComponent("/roadmap")}`}>
          <Plus />
          Entrar pra sugerir
        </Link>
      </Button>
    );
  }

  function onSubmit(values: FormInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await suggestFeatureAction({
        title: values.title,
        description: values.description,
        product: values.product as RoadmapProduct,
      });
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      reset({ product: "exam" });
      setOpen(false);
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset({ product: "exam" });
      setServerError(null);
    }
  }

  const product = watch("product");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary" size="md" className="shrink-0">
          <Plus />
          Sugerir feature
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sugerir feature</DialogTitle>
          <DialogDescription>
            Conta o que você gostaria de ver na Lucida. Sua sugestão aparece
            na lista pra todo mundo votar.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="suggest-title">Título</Label>
            <Input
              id="suggest-title"
              placeholder="Resumo curto da feature"
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              disabled={isPending}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="suggest-description">Descrição (opcional)</Label>
            <Textarea
              id="suggest-description"
              placeholder="Descreve com mais detalhes o problema que isso resolveria"
              rows={4}
              disabled={isPending}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Onde essa feature se encaixa?</Label>
            <div className="flex gap-2">
              {ROADMAP_PRODUCTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue("product", p, { shouldDirty: true })}
                  className={
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors " +
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
              {isPending ? "Enviando..." : "Enviar sugestão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
