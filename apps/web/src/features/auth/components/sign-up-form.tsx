"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { signUpSchema, type SignUpInput } from "../schemas";

export function SignUpForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: "/app",
    });
    if (error) {
      setServerError(error.message ?? "Não foi possível criar sua conta.");
      return;
    }
    setEmailSentTo(values.email);
  }

  if (emailSentTo) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Mail className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-ink">Confirme seu e-mail</h2>
          <p className="text-sm text-gray-500">
            Enviamos um link de confirmação para{" "}
            <strong className="text-ink">{emailSentTo}</strong>. Clique no link para ativar
            sua conta e entrar automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Como podemos te chamar?"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name && <FieldError message={errors.name.message} />}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@escola.com.br"
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
          autoComplete="new-password"
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

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Criando conta..." : "Criar conta"}
        {!isSubmitting && <ArrowRight />}
      </Button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        ou
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleButton label="Cadastrar com Google" />
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
