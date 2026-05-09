import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description:
    "O endereço que você acessou não existe, foi movido ou está com link quebrado.",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(0,122,255,0.08),transparent_70%)]"
      />

      <header className="relative z-10 flex justify-center px-6 pt-10 sm:pt-12">
        <Link href="/" aria-label="Lucida" className="inline-flex">
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p
          aria-hidden
          className="font-serif italic leading-none text-ink/90 text-[clamp(8rem,22vw,16rem)]"
        >
          404
        </p>

        <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          Esta página se perdeu no caminho
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-gray-500">
          O endereço que você acessou não existe, foi movido ou está com link
          quebrado. Que tal voltar ao início?
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link href="/">Voltar à página inicial</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/contact">Falar com a gente</Link>
          </Button>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-8 text-center text-xs text-gray-400">
        Erro 404 · Lucida
      </footer>
    </div>
  );
}
