import {
  Check,
  Clock,
  FileText,
  Presentation,
  Sparkles,
  Notebook,
  X,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

const BEFORE = [
  "Horas montando material do zero a cada semana",
  "Caça-minas no Google em busca de exercícios bons",
  "Word + PowerPoint + Excel + email — cada coisa num lugar",
  "Correção manual de cada folha, uma por uma",
  "Sem visão de quem aprendeu o quê",
];

const AFTER = [
  "Provas, slides e planos prontos em minutos",
  "Material gerado a partir do seu próprio conteúdo",
  "Tudo num só painel — turmas, provas, notas, análises",
  "Correção automática (até em folhas de papel)",
  "Insights por turma, aluno e questão",
];

interface SavingRow {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  before: string;
  after: string;
}

const SAVINGS: SavingRow[] = [
  { icon: FileText, label: "Prova de 10 questões", before: "~3 h", after: "~10 min" },
  { icon: Presentation, label: "Slides para uma aula", before: "~2 h", after: "~3 min" },
  { icon: Notebook, label: "Plano de aula completo", before: "~1 h", after: "~5 min" },
];

export function BeforeAfterSection() {
  return (
    <section className="relative py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>Antes e depois</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            A diferença que cabe na sua{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              semana
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            O mesmo trabalho — em uma fração do tempo, com mais qualidade.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-gray-50/40 p-7 md:p-8">
            <header className="flex items-center gap-2">
              <Clock className="size-4 text-gray-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                Sem a Lucida
              </span>
            </header>
            <div>
              <div className="text-3xl font-medium tracking-tighter text-gray-700 md:text-4xl">
                ~6 h por semana só montando material
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Provas, slides e planos somados — fora a correção, fora a
                análise dos resultados.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {BEFORE.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-gray-600"
                >
                  <X className="mt-0.5 size-4 shrink-0 text-gray-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-brand-primary/20 bg-white p-7 md:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-primary/8 blur-3xl"
            />
            <header className="relative flex items-center gap-2">
              <Sparkles className="size-4 text-brand-primary" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-brand-primary">
                Com a Lucida
              </span>
            </header>
            <div className="relative">
              <div className="text-3xl font-medium tracking-tighter text-ink md:text-4xl">
                <span className="font-serif italic text-brand-primary">
                  ~20 min
                </span>{" "}
                — e tudo pronto
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Prova, slides e plano de aula gerados, aplicados e prontos
                para corrigir.
              </p>
            </div>
            <ul className="relative flex flex-col gap-3">
              {AFTER.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm font-medium text-ink"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-brand-primary"
                    strokeWidth={2.5}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Strip de economia por tipo de material */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SAVINGS.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <row.icon className="size-4" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5 leading-tight">
                <div className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                  {row.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400 line-through decoration-1">
                    {row.before}
                  </span>
                  <span className="text-base text-gray-300">→</span>
                  <span className="font-serif text-xl italic text-brand-primary">
                    {row.after}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
