import Link from "next/link";
import {
  ArrowRight,
  Building2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AnalyticsMockup } from "@/features/marketing/components/analytics-mockup";

const FEATURES = [
  {
    icon: Users,
    title: "Gestão de equipe",
    desc: "Convide professores e atribua permissões.",
  },
  {
    icon: Wallet,
    title: "Saldo compartilhado",
    desc: "Pool institucional de créditos.",
  },
  {
    icon: TrendingUp,
    title: "KPIs consolidados",
    desc: "Visão por escola, série e disciplina.",
  },
  {
    icon: Building2,
    title: "Multi-unidade",
    desc: "Para redes com várias escolas.",
  },
];

/**
 * Seção dedicada ao Lucida Analytics — segundo produto da marca, voltado pra
 * coordenação institucional. Usa a paleta roxa (`#6C3CFB`) num bloco escuro
 * autocontido, sinalizando visualmente que é "outro contexto" sem misturar
 * com o azul do Exam que domina o resto da landing.
 */
export function AnalyticsSection() {
  return (
    <section
      id="analytics"
      className="relative overflow-hidden bg-brand-super-dark py-20 text-brand-off-white md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full bg-analytics-primary/30 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 size-[500px] rounded-full bg-analytics-dark-01/20 blur-[120px]"
      />

      <Container size="wide">
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill border border-analytics-primary/30 bg-analytics-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-analytics-light">
              <Building2 className="size-3" />
              Lucida Analytics
            </div>

            <h2 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tighter text-white md:text-5xl">
              Para quem coordena{" "}
              <span className="font-serif font-normal italic text-analytics-light">
                a escola toda
              </span>
              .
            </h2>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
              O Lucida Analytics é o ambiente para coordenadores, diretores e
              redes de escolas acompanharem o uso, o desempenho e o saldo
              institucional — com visão consolidada de todos os professores.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-analytics-primary/20 text-analytics-light">
                    <f.icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {f.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-white/60">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Button
                asChild
                size="lg"
                className="bg-analytics-primary text-white shadow-soft hover:bg-analytics-dark-01"
              >
                <Link href="/contact/institutions">
                  Falar com a gente
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <AnalyticsMockup />
          </div>
        </div>
      </Container>
    </section>
  );
}
