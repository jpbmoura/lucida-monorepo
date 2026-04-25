import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { cn } from "@/lib/utils";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  photo?: string;
}

const FEATURED: Testimonial = {
  quote:
    "A plataforma tem me ajudado bastante em sala de aula, especialmente na criação de simulados online, com correção já pronta. Contribuiu muito para o desenvolvimento das aulas por gerar atividades inéditas, que vão além de cópias da internet.",
  name: "Wanderson Schneider",
  role: "Professor de Matemática",
  photo: "/people/wanderson-profile.jpg",
};

const SECONDARY: Testimonial[] = [
  {
    quote:
      "Ganhei horas toda semana. O que eu levava uma tarde inteira para montar, a Lulu entrega em minutos.",
    name: "Ana Beatriz",
    role: "Professora · Ensino Médio",
  },
  {
    quote:
      "A correção automática mudou o jogo para mim. Consigo dar feedback na hora para a turma.",
    name: "Luís Henrique",
    role: "Coordenador pedagógico",
  },
  {
    quote:
      "Uso a Lucida em todas as turmas do fundamental. Os pais percebem a diferença nos relatórios.",
    name: "Ester Lima",
    role: "Professora · Fundamental II",
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative bg-gray-50 py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>Quem usa, conta</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Feita por professores,{" "}
            <span className="font-serif font-normal italic text-brand-primary">para professores</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <FeaturedCard testimonial={FEATURED} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {SECONDARY.map((t) => (
              <SmallCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FeaturedCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="relative flex min-h-[340px] flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-brand-super-dark p-8 text-brand-off-white md:p-10">
      <LuluDecoration />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-brand-light">
          Depoimento em destaque
          <span className="h-px flex-1 bg-brand-light/20" />
        </div>
        <blockquote className="font-serif text-2xl leading-[1.2] tracking-tight md:text-[1.75rem]">
          “<span className="italic text-brand-light">{testimonial.quote}</span>”
        </blockquote>
      </div>

      <figcaption className="relative z-10 flex items-center gap-3">
        {testimonial.photo && (
          <Image
            src={testimonial.photo}
            alt={testimonial.name}
            width={44}
            height={44}
            className="size-11 rounded-full object-cover ring-2 ring-white/10"
          />
        )}
        <div className="text-sm leading-tight">
          <div className="font-medium text-white">{testimonial.name}</div>
          <div className="mt-0.5 text-brand-light/80">{testimonial.role}</div>
        </div>
      </figcaption>
    </figure>
  );
}

function SmallCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure
      className={cn(
        "flex flex-col justify-between gap-6 rounded-2xl border border-gray-100 bg-white p-6",
      )}
    >
      <blockquote className="text-sm leading-relaxed text-gray-700">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="text-xs leading-tight">
        <div className="font-medium text-ink">{testimonial.name}</div>
        <div className="mt-0.5 text-gray-500">{testimonial.role}</div>
      </figcaption>
    </figure>
  );
}

function LuluDecoration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-10 -top-10 size-60 opacity-10"
    >
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="100" rx="80" ry="70" fill="#7FBDF4" />
        <ellipse cx="40" cy="100" rx="20" ry="50" fill="#7FBDF4" />
        <ellipse cx="160" cy="100" rx="15" ry="40" fill="#7FBDF4" />
        <circle cx="75" cy="95" r="12" fill="#051E2C" />
        <circle cx="125" cy="95" r="12" fill="#051E2C" />
      </svg>
    </div>
  );
}
