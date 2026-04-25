import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { TrustStrip } from "@/features/marketing/components/trust-strip";
import { TypewriterCycle } from "@/features/marketing/components/typewriter-cycle";

const HERO_WORDS = [
  "provas",
  "slides",
  "aulas",
  "atividades",
  "simulados",
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(127,189,244,0.22),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-brand-light/40 to-transparent"
      />

      <Container>
        <div className="flex flex-col items-center text-center">
          <Eyebrow>O cinto de utilidades do professor</Eyebrow>

          <h1 className="mt-6 max-w-4xl text-5xl font-medium leading-[0.95] tracking-tighter text-ink md:text-7xl lg:text-[clamp(4.5rem,8vw,6.5rem)]">
            Crie{" "}
            <TypewriterCycle
              words={HERO_WORDS}
              className="font-serif font-normal italic text-brand-primary"
            />
            {" "}com IA em segundos.
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg text-gray-500 md:text-xl">
            Da elaboração do material à análise dos resultados — a Lucida reúne
            tudo que a sua semana pede em um só painel: provas, correção,
            turmas e relatórios.
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild variant="primary" size="xl" className="w-full sm:w-auto">
              <Link href="/sign-up">
                Começar agora
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="xl" className="w-full sm:w-auto">
              <Link href="#how-it-works">Ver como funciona</Link>
            </Button>
          </div>

          <div className="mt-10">
            <TrustStrip />
          </div>
        </div>
      </Container>
    </section>
  );
}
