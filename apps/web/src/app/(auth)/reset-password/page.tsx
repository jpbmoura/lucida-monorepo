import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { AuthFormSide } from "@/features/auth/components/auth-form-side";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default function ResetPasswordPage() {
  return (
    <>
      <AuthFormSide variant="exam">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Nova senha</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink">
              Crie uma{" "}
              <span className="font-serif font-normal italic text-brand-primary">
                nova senha
              </span>
              .
            </h1>
            <p className="text-sm text-gray-500">
              Use uma senha forte com pelo menos 8 caracteres.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-xl bg-gray-50" />
            }
          >
            <ResetPasswordForm />
          </Suspense>

          <p className="text-sm text-gray-500">
            Mudou de ideia?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              Voltar pra entrar
            </Link>
          </p>
        </div>
      </AuthFormSide>

      <AuthBrandPanel variant="exam" />
    </>
  );
}
