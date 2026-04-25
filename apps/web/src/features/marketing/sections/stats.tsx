import { Container } from "@/components/ui/container";

const STATS = [
  { value: "+3 mil", label: "Professores ativos" },
  { value: "+180k", label: "Materiais gerados pela IA" },
  { value: "42h", label: "Economizadas por mês, em média" },
  { value: "98%", label: "Recomendariam para um colega" },
];

/**
 * Faixa fina de prova social entre Hero e DashboardPreview. Sem fundo
 * colorido — quebra os blocos do conteúdo só com hairlines superior e
 * inferior, deixando a página respirar e os números falarem por si.
 */
export function StatsSection() {
  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent"
      />

      <Container size="wide">
        <div className="grid grid-cols-2 divide-x divide-gray-100 py-12 md:grid-cols-4 md:py-14">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-2 px-4 text-center"
            >
              <div className="font-serif text-4xl italic leading-none tracking-tight text-brand-primary md:text-5xl">
                {stat.value}
              </div>
              <div className="text-xs leading-snug text-gray-500 md:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
