import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { DashboardMockup } from "@/features/marketing/components/dashboard-mockup";

export function DashboardPreviewSection() {
  return (
    <section id="preview" className="relative py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"
      />

      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>Um painel, todo o processo</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Tudo que a sua semana pede,{" "}
            <span className="font-serif font-normal italic text-brand-primary">em um lugar só</span>.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Provas, correções, turmas e análises conectadas. Sem abrir cinco abas, sem planilha perdida.
          </p>
        </div>

        <div className="relative mx-auto max-w-[76rem]">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-20 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,122,255,0.08),transparent_65%)]"
          />
          <DashboardMockup />
        </div>
      </Container>
    </section>
  );
}
