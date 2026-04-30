import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { AuthFormSide } from "@/features/auth/components/auth-form-side";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthFormSide variant="exam">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Recuperar acesso</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink">
              Esqueceu a{" "}
              <span className="font-serif font-normal italic text-brand-primary">
                senha
              </span>
              ?
            </h1>
            <p className="text-sm text-gray-500">
              Sem problema — vamos mandar um link no seu email pra você criar
              uma nova.
            </p>
          </div>

          <ForgotPasswordForm />

          <p className="text-sm text-gray-500">
            Lembrou da senha?{" "}
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
