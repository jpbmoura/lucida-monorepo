import {
  BarChart3,
  Check,
  FileText,
  Presentation,
  ScanLine,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

interface SecondaryFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const SECONDARY: SecondaryFeature[] = [
  {
    icon: ScanLine,
    title: "Correção automática",
    description:
      "Online corrige na hora. No papel, basta tirar uma foto — a Lucida lê o gabarito.",
  },
  {
    icon: Send,
    title: "Aplicação online ou impressa",
    description:
      "Compartilhe um link com a turma ou imprima a folha de respostas. Os alunos respondem onde for melhor.",
  },
  {
    icon: Users,
    title: "Gestão de turmas",
    description:
      "Cadastre alunos, organize turmas e acompanhe o histórico de cada um num painel central.",
  },
  {
    icon: BarChart3,
    title: "Análises por turma e aluno",
    description:
      "Veja desempenho por questão e identifique exatamente o conteúdo que precisa ser reforçado.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>Recursos</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Tudo que você precisa para{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              ensinar melhor
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Sem ficar abrindo cinco ferramentas diferentes pra dar conta da
            semana.
          </p>
        </div>

        <SpotlightGenerator />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECONDARY.map((feature) => (
            <SecondaryCard key={feature.title} feature={feature} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function SpotlightGenerator() {
  return (
    <article className="relative grid grid-cols-1 gap-10 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 md:p-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:p-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.08),transparent_70%)]"
      />

      <div className="relative flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-brand-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-primary">
          <Sparkles className="size-3" />
          Geração com IA
        </span>

        <h3 className="text-3xl font-medium leading-[1.05] tracking-tighter text-ink md:text-4xl">
          Provas, slides e aulas —{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            do mesmo material
          </span>
          .
        </h3>

        <p className="text-base leading-relaxed text-gray-500 md:text-[17px]">
          Suba um PDF, cole um texto ou aponte um vídeo. A Lucida entende o
          conteúdo e gera o que você pedir — uma prova ENEM, slides para a
          próxima aula, ou um plano completo. Tudo a partir do que você já
          tem.
        </p>

        <ul className="flex flex-wrap gap-2">
          {[
            { label: "Provas", primary: true },
            { label: "Slides" },
            { label: "Planos de aula" },
            { label: "Atividades" },
            { label: "Simulados" },
          ].map((chip) => (
            <li
              key={chip.label}
              className={
                chip.primary
                  ? "rounded-pill bg-ink px-3 py-1.5 text-[12px] font-medium text-white"
                  : "rounded-pill border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600"
              }
            >
              {chip.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <GeneratorMockup />
      </div>
    </article>
  );
}

/**
 * Mockup do "estúdio" de geração — janela com tabs (Provas/Slides/Aulas) e
 * preview do conteúdo gerado pra cada uma. Estático, só visual; serve pra
 * comunicar de relance que a Lucida cria múltiplos formatos.
 */
function GeneratorMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-4 -bottom-8 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(127,189,244,0.18),transparent_65%)]"
      />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-pop">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50/60 px-3 py-2">
          <TabPill icon={FileText} label="Prova" active />
          <TabPill icon={Presentation} label="Slides" />
          <TabPill icon={FileText} label="Aula" />
          <div className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Gerando…
          </div>
        </div>

        {/* Conteúdo "gerado" */}
        <div className="space-y-5 p-5 md:p-6">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Questão 1 — Múltipla escolha
              </span>
              <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-brand-primary">
                ENEM
              </span>
            </div>
            <p className="text-sm font-medium text-ink">
              Qual é a principal função do sistema nervoso central no organismo
              humano?
            </p>
          </div>

          <ul className="flex flex-col gap-1.5">
            {[
              "Bombear sangue pelos vasos sanguíneos",
              "Coordenar e controlar as atividades do organismo",
              "Realizar trocas gasosas entre o ar e o sangue",
              "Produzir e distribuir hormônios",
            ].map((option, i) => (
              <li
                key={option}
                className={
                  i === 1
                    ? "flex items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-xs font-medium text-brand-primary"
                    : "flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs text-gray-500"
                }
              >
                <span
                  className={
                    i === 1
                      ? "grid size-4 shrink-0 place-items-center rounded-full border border-brand-primary bg-brand-primary text-white"
                      : "grid size-4 shrink-0 place-items-center rounded-full border border-gray-300"
                  }
                >
                  {i === 1 && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                {option}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Sparkles className="size-3 text-brand-primary" />
              Gerada a partir de{" "}
              <span className="font-medium text-gray-600">
                Aula 7 — Sistema Nervoso.pdf
              </span>
            </div>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="rounded-pill bg-ink px-3 py-1 text-[10px] font-medium text-white"
            >
              Próxima questão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabPillProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}

function TabPill({ icon: Icon, label, active }: TabPillProps) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-ink shadow-soft"
          : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-gray-400"
      }
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function SecondaryCard({ feature }: { feature: SecondaryFeature }) {
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-soft">
      <span className="grid size-10 place-items-center rounded-xl bg-gray-50 text-gray-600 transition-colors group-hover:bg-brand-primary/10 group-hover:text-brand-primary">
        <feature.icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-medium tracking-tight text-ink">
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed text-gray-500">
          {feature.description}
        </p>
      </div>
    </article>
  );
}
