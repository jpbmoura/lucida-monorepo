/**
 * Bloco final do dashboard com o roadmap visível. Mantém a mesma estética
 * "no forno" usada no placeholder da Fase 1 — quando uma dessas features
 * ficar pronta, é só remover o item daqui.
 */
export function ComingSoonSection() {
  const items = [
    {
      title: "Análises agregadas",
      desc: "Drill por turma, disciplina ou ano. Relatórios prontos para reunião pedagógica.",
    },
    {
      title: "Convites e permissões",
      desc: "Convidar professores por e-mail, ajustar papéis (admin, leitura) e remover membros.",
    },
    {
      title: "Relatórios exportáveis",
      desc: "PDF e planilha para compartilhar com mantenedora ou coordenação externa.",
    },
    {
      title: "Benchmark entre turmas",
      desc: "Comparar desempenho entre séries ou disciplinas dentro da mesma instituição.",
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-tight text-ink">No forno</h2>
        <p className="text-sm text-gray-500">
          O que a Lulu está preparando para o ambiente de instituição nas
          próximas iterações.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5"
          >
            <div className="text-sm font-medium text-ink">{item.title}</div>
            <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
