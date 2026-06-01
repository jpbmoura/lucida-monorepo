import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { AuthFormSide } from "@/features/auth/components/auth-form-side";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";
import { redirectIfAuthenticated } from "@/lib/redirect-if-authenticated";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  await redirectIfAuthenticated("/app", next);

  return (
    <>
      <AuthFormSide variant="exam">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Entrar</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink">
              Bom te ver de{" "}
              <span className="font-serif font-normal italic text-brand-primary">volta</span>.
            </h1>
            <p className="text-sm text-gray-500">
              Use seu e-mail ou sua conta Google para continuar.
            </p>
          </div>

          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-gray-50" />}>
            <SignInForm />
          </Suspense>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              Novo por aqui?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Criar conta
              </Link>
            </p>

            <div className="border-t border-gray-100 pt-3">
              <Link
                href="/organizacoes/entrar"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 underline-offset-4 hover:text-ink hover:underline"
              >
                Entrar como instituição →
              </Link>
            </div>
          </div>
        </div>
      </AuthFormSide>

      <AuthBrandPanel variant="exam" />
    </>
  );
}
