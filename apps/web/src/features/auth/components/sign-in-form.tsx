"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { signInSchema, type SignInInput } from "../schemas";

interface SignInFormProps {
  /**
   * Rota pra onde mandar o user depois do login, quando não vier `?next=`
   * da URL. Default `/app` (professor). Em `/organizacoes/entrar` isso vira
   * `/analytics` — o único bit que diferencia o form institucional do padrão.
   */
  defaultCallback?: string;
  /**
   * Mostra botão "Entrar com Google". Default `true`. No login de instituição
   * (/organizacoes/entrar) é `false` — contas institucionais só entram com
   * email+senha (decisão: evita que um owner de org confunda com conta
   * pessoal Google e também força credenciais administrativas).
   */
  allowGoogle?: boolean;
}

export function SignInForm({
  defaultCallback = "/app",
  allowGoogle = true,
}: SignInFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? defaultCallback;

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(values: SignInInput) {
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

    // Login institucional: garante que a sessão tem `activeOrganizationId`
    // setado. Sem isso, o backend do /analytics responde 400 porque o BA
    // não escolhe org ativa automaticamente no sign-in. Busca a primeira
    // org do user e ativa. Falhas são toleradas — o layout do /analytics
    // tem empty-state "sem org ativa" como fallback.
    if (defaultCallback === "/analytics") {
      try {
        const orgs = await authClient.organization.list();
        const first = orgs.data?.[0];
        if (first?.id) {
          await authClient.organization.setActive({ organizationId: first.id });
        }
      } catch {
        // intentional no-op
      }
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-gray-500 underline-offset-4 hover:text-ink hover:underline"
          >
            Esqueceu?
          </Link>
        </div>
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

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Entrando..." : "Entrar"}
        {!isSubmitting && <ArrowRight />}
      </Button>

      {allowGoogle && (
        <>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            ou
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleButton callbackUrl={next} label="Entrar com Google" />
        </>
      )}
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}
