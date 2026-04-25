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
import { promoteStaffAction } from "../data";

const schema = z.object({
  email: z.string().email("E-mail inválido."),
});

type FormInput = z.infer<typeof schema>;

// Dialog pra promover um user a staff. Fluxo (a): a pessoa já precisa ter
// conta na Lucida — se não tiver, o backend devolve USER_NOT_FOUND e a
// gente mostra a mensagem do servidor no form.
export function AddStaffDialog() {
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
  });

  function onSubmit(values: FormInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await promoteStaffAction(values.email);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      reset();
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
          Dar acesso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar acesso ao Kintal</DialogTitle>
          <DialogDescription>
            A pessoa precisa já ter uma conta na Lucida (Google ou e-mail).
            Digite o e-mail cadastrado pra conceder acesso.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-staff-email">E-mail</Label>
            <Input
              id="add-staff-email"
              type="email"
              autoComplete="off"
              placeholder="pessoa@lucida.com"
              aria-invalid={errors.email ? true : undefined}
              disabled={isPending}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
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
              {isPending ? "Concedendo..." : "Conceder acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
