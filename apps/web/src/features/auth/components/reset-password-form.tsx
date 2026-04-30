"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

/**
 * Formulário pra criar nova senha após clicar no link do email. Token
 * vem na query string (`?token=xxx`) — adicionado pelo BetterAuth quando
 * gera o link no `sendResetPassword` callback.
 *
 * Sem token na URL = link inválido ou veio de outro lugar — mostramos
 * erro com link pra recomeçar o fluxo.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <div className="flex items-center gap-2.5 text-red-700">
          <AlertCircle className="size-5" />
          <span className="font-medium">Link inválido</span>
        </div>
        <p className="text-sm leading-relaxed text-red-900/80">
          Esse link não tem o token de redefinição. Pode ser que tenha
          expirado ou sido aberto fora do fluxo correto.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-red-700 underline-offset-4 hover:underline"
        >
          Pedir um novo link →
        </Link>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return;
    setServerError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if (error) {
      setServerError(
        error.message ??
          "Não foi possível redefinir a senha. O link pode ter expirado.",
      );
      return;
    }
    setSuccess(true);
    // Pequeno delay pra dar feedback visual antes de navegar.
    setTimeout(() => {
      router.push("/sign-in?reset=success");
    }, 1500);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="font-medium text-emerald-700">Senha redefinida</div>
        <p className="text-sm leading-relaxed text-emerald-900/80">
          Tudo certo. Estamos te levando pra tela de login...
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
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          placeholder="Mínimo 8 caracteres"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          aria-invalid={errors.confirmPassword ? true : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-600">
            {errors.confirmPassword.message}
          </p>
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
        {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
        {!isSubmitting && <ArrowRight />}
      </Button>
    </form>
  );
}
