// Helpers de formatação usados só nos cards do Kintal. Ficam isolados do
// `@/lib/utils` global pra não poluir o namespace compartilhado — o resto
// do app exige formats parametrizados (locale/currency configuráveis), aqui
// a gente fixa pt-BR/BRL que é a moeda de trabalho do backoffice.

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function formatBrl(cents: number): string {
  return BRL.format(cents / 100);
}

export function formatInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function formatPct(pct: number): string {
  return `${pct.toFixed(pct >= 10 ? 1 : 2).replace(".", ",")}%`;
}
