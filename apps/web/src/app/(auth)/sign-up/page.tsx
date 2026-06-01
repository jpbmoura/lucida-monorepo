import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { AuthFormSide } from "@/features/auth/components/auth-form-side";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";
import { redirectIfAuthenticated } from "@/lib/redirect-if-authenticated";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default async function SignUpPage() {
  await redirectIfAuthenticated("/app");

  return (
    <>
      <AuthFormSide variant="exam">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Criar conta</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink">
              Comece sua{" "}
              <span className="font-serif font-normal italic text-brand-primary">primeira prova</span>.
            </h1>
            <p className="text-sm text-gray-500">Grátis para começar. Sem cartão.</p>
          </div>

          <SignUpForm />

          <p className="text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/sign-in" className="font-medium text-ink underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </AuthFormSide>

      <AuthBrandPanel variant="exam" />
    </>
  );
}
