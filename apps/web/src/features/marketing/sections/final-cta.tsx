import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { TrustStrip } from "@/features/marketing/components/trust-strip";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-brand-super-dark py-24 text-brand-off-white md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(0,122,255,0.22),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-light/30 to-transparent"
      />

      <Container>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-4xl font-medium leading-[1.02] tracking-tighter text-white md:text-6xl">
            Ganhe tempo{" "}
            <span className="font-serif font-normal italic text-brand-light">
              para o que importa
            </span>
            : ensinar.
          </h2>

          <p className="mt-6 max-w-xl text-lg text-white/70">
            Em menos de 5 minutos você tem sua primeira prova gerada, aplicada
            e pronta para corrigir.
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild variant="accent" size="xl" className="w-full sm:w-auto">
              <Link href="/sign-up">
                Começar agora
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="xl"
              className="w-full text-white/80 hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link href="/contact/institutions">
                <Building2 />
                Sou de uma instituição
              </Link>
            </Button>
          </div>

          <div className="mt-10">
            <TrustStrip tone="dark" />
          </div>
        </div>
      </Container>
    </section>
  );
}
