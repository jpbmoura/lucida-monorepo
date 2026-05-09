import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function AnalyticsNotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(108,60,251,0.08),transparent_70%)]"
      />

      <p
        aria-hidden
        className="font-serif italic leading-none text-ink/90 text-[clamp(7rem,18vw,13rem)]"
      >
        404
      </p>

      <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        Não encontramos esta página
      </h1>

      <p className="mt-4 max-w-md text-base leading-relaxed text-gray-500">
        O endereço que você acessou não existe, foi movido ou está com link
        quebrado.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          className="bg-analytics-primary text-white hover:bg-analytics-dark-01"
        >
          <Link href="/analytics">Voltar ao analytics</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/">Ir para a página inicial</Link>
        </Button>
      </div>
    </main>
  );
}
