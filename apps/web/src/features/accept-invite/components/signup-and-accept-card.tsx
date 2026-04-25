"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome com ao menos 2 caracteres."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});

type SignupValues = z.infer<typeof signupSchema>;

interface SignupAndAcceptCardProps {
  invitationId: string;
  email: string;
  organizationName: string;
  inviterName: string;
}

/**
 * Cenário: user não tem conta. Mostramos form inline (email travado) +
 * senha. O email do convite é prova de posse, então o backend cria a
 * conta com `emailVerified=true` e associa à org de uma vez. Depois
 * disso, o frontend faz signIn.email pra logar e mandar pra /app.
 */
export function SignupAndAcceptCard({
  invitationId,
  email,
  organizationName,
  inviterName,
}: SignupAndAcceptCardProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", password: "" },
  });

  async function onSubmit(values: SignupValues) {
    setServerError(null);

    // 1. Backend cria user + member + marca invite aceito de uma vez.
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    const res = await fetch(
      `${apiBase}/v1/analytics/accept-invite-with-signup`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invitationId,
          name: values.name,
          password: values.password,
        }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null;
      setServerError(
        data?.message ?? "Não foi possível aceitar o convite. Tente de novo.",
      );
      return;
    }

    // 2. Frontend loga com as credenciais recém-criadas.
    const signInRes = await authClient.signIn.email({
      email,
      password: values.password,
      callbackURL: "/app",
    });
    if (signInRes.error) {
      setServerError(
        "Conta criada, mas não consegui te logar. Tente entrar manualmente.",
      );
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-10 shadow-soft">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-primary">
          <span className="pulse-dot" aria-hidden />
          Convite
        </span>
        <h1 className="text-3xl font-medium leading-[1.05] tracking-tight text-ink">
          Bem-vindo à{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            Lucida
          </span>
          .
        </h1>
        <p className="text-sm leading-relaxed text-gray-500">
          <span className="font-medium text-ink">{inviterName}</span> te convidou para
          entrar na instituição{" "}
          <span className="font-medium text-ink">{organizationName}</span>. Crie sua
          senha para começar.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email">E-mail</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            readOnly
            aria-readonly
            className="bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-400">
            Travado porque é o e-mail do convite.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-name">Nome completo</Label>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="Ex: Maria da Silva"
            autoFocus
            aria-invalid={form.formState.errors.name ? true : undefined}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-password">Senha</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <ul className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-[13px] text-gray-600">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
            Seu e-mail já vem verificado pelo convite.
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
            Você pode criar provas, turmas e corrigir submissões assim que entrar.
          </li>
        </ul>

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
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting ? "Entrando..." : "Criar conta e entrar"}
          {!form.formState.isSubmitting && <ArrowRight />}
        </Button>
      </form>
    </div>
  );
}
