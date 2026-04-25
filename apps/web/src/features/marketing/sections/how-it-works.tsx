import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

interface Step {
  number: string;
  title: React.ReactNode;
  description: string;
  lulu?: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: (
      <>
        Envie seu <span className="font-serif italic text-brand-primary">material</span>
      </>
    ),
    description:
      "PDF, Word, apresentação ou um link do YouTube. A Lulu lê e entende o conteúdo da sua aula.",
  },
  {
    number: "02",
    title: (
      <>
        A Lulu <span className="font-serif italic text-brand-primary">monta</span>{" "}
        o material
      </>
    ),
    description:
      "Diga o que precisa: uma prova ENEM, slides para a próxima aula ou um plano completo. A Lulu entrega em segundos.",
    lulu: "/brand/lulu/Lulu-07.svg",
  },
  {
    number: "03",
    title: (
      <>
        Aplique e <span className="font-serif italic text-brand-primary">colete</span> resultados
      </>
    ),
    description:
      "Online, impresso com gabarito automatizado, ou os dois. Correção na hora, análise por aluno e turma.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Três passos do{" "}
            <span className="font-serif font-normal italic text-brand-primary">material à correção</span>.
          </h2>
        </div>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="group relative flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 transition-all hover:border-gray-200 hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-4xl italic text-gray-300 transition-colors group-hover:text-brand-primary">
                  {step.number}
                </span>
                {step.lulu && (
                  <Image
                    src={step.lulu}
                    alt=""
                    aria-hidden
                    width={52}
                    height={52}
                    className="size-12 opacity-80"
                  />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-medium leading-tight tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
