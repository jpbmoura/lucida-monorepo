"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kintalSignInSchema, type KintalSignInInput } from "../schemas";

// Login exclusivo do backoffice Kintal. Só email+senha (sem Google, sem
// link de cadastro) — contas staff são criadas manualmente no banco. A
// verificação de `role === "staff"` acontece no layout /kintal/(app); aqui
// a gente só entrega credenciais válidas pra BA e deixa o redirect seguir.
export function KintalSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/kintal";
  const initialError = searchParams.get("error");

  const [serverError, setServerError] = useState<string | null>(
    initialError === "forbidden"
      ? "Sua conta não tem acesso ao Kintal."
      : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KintalSignInInput>({
    resolver: zodResolver(kintalSignInSchema),
  });

  async function onSubmit(values: KintalSignInInput) {
    setServerError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: next,
    });
    if (error) {
      setServerError(
        error.message ?? "Não foi possível entrar. Confira suas credenciais.",
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@lucidaexam.com"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email && <FieldError message={errors.email.message} />}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 8 caracteres"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && <FieldError message={errors.password.message} />}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        className="w-full hover:!bg-gray-800"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
        {!isSubmitting && <ArrowRight />}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
