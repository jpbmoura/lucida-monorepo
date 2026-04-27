interface UsuariosPageHeaderProps {
  total: number;
}

// Mesmo vocabulário da /kintal/acessos: eyebrow, H1 grande com destaque
// serif italic, subtítulo curto. Sem CTA primário — a lista é read-only +
// drill-down (não dá pra criar user pelo backoffice).
export function UsuariosPageHeader({ total }: UsuariosPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Operações
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          Usuários da{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            Lucida
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Quem usa a plataforma. Filtra, abre o cadastro de cada pessoa e
          ajusta saldo quando precisa.
        </p>
      </div>

      <div className="text-right">
        <div className="text-3xl font-medium tracking-tighter tabular-nums text-ink">
          {total.toLocaleString("pt-BR")}
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">
          {total === 1 ? "resultado" : "resultados"}
        </div>
      </div>
    </div>
  );
}
