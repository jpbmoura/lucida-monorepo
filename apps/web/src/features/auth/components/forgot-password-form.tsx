"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";

/**
 * Formulário "esqueci minha senha". Pede o email, dispara
 * `authClient.requestPasswordReset` com `redirectTo` apontando pra
 * `/reset-password` — o BetterAuth gera o token, manda email com URL pronta,
 * e quando o user clica ele aterrissa em /reset-password?token=xxx.
 *
 * Nunca revelamos se o email existe ou não — o servidor sempre devolve 200
 * pra evitar enumeração de contas. Independente, mostramos a mesma mensagem
 * de "verifique seu email" pro user.
 */
export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    // Trata 4xx como erro do servidor (raro — geralmente só rate limit).
    // Sucesso silencioso é a regra: response OK não significa "email
    // existe", só "request foi aceita".
    if (error) {
      setServerError(
        error.message ?? "Não foi possível enviar o email. Tente de novo.",
      );
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="flex items-center gap-2.5 text-emerald-700">
          <Mail className="size-5" />
          <span className="font-medium">Email enviado</span>
        </div>
        <p className="text-sm leading-relaxed text-emerald-900/80">
          Se existe uma conta com{" "}
          <strong>{getValues("email")}</strong>, você vai receber um link nos
          próximos minutos pra criar uma nova senha. Olha também na pasta de
          spam.
        </p>
      </div>
    );
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
          autoFocus
          placeholder="voce@escola.com.br"
          aria-invalid={errors.email ? true : undefined}
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

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
        {!isSubmitting && <ArrowRight />}
      </Button>
    </form>
  );
}
