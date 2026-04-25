import { Suspense } from "react";
import type { Metadata } from "next";
import { KintalLogo } from "@/features/kintal/components/kintal-logo";
import { KintalSignInForm } from "@/features/kintal/components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function KintalSignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-10">
        <div className="flex flex-col items-center gap-6">
          <KintalLogo variant="symbol" className="h-10 w-auto" />
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-medium tracking-tight text-ink">
              Kintal
            </h1>
            <p className="text-sm text-gray-500">
              Acesso interno da equipe Lucida.
            </p>
          </div>
        </div>

        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-50" />}
        >
          <KintalSignInForm />
        </Suspense>
      </div>
    </div>
  );
}
