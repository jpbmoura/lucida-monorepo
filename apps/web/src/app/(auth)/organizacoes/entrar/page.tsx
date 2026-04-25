import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { AuthFormSide } from "@/features/auth/components/auth-form-side";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

export const metadata: Metadata = {
  title: "Entrar · Instituição",
};

export default function OrganizationSignInPage() {
  return (
    <>
      <AuthFormSide variant="analytics">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Instituição</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink">
              Bem-vindo ao{" "}
              <span className="font-serif font-normal italic text-analytics-primary">
                Analytics
              </span>
              .
            </h1>
            <p className="text-sm text-gray-500">
              Entre com a conta da sua instituição para acessar o painel de gestão.
            </p>
          </div>

          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-gray-50" />}>
            <SignInForm defaultCallback="/analytics" allowGoogle={false} />
          </Suspense>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              Não tem acesso ainda?{" "}
              <Link
                href="/contato"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Falar com a Lucida
              </Link>
            </p>

            <div className="border-t border-gray-100 pt-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 underline-offset-4 hover:text-ink hover:underline"
              >
                ← Voltar para o login de professor
              </Link>
            </div>
          </div>
        </div>
      </AuthFormSide>

      <AuthBrandPanel variant="analytics" />
    </>
  );
}
