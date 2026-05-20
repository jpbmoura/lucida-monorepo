import type { StyleSpec } from "../types.js";

export const simpleStyle: StyleSpec = {
  key: "simple",
  label: "Simples",
  target: "sala de aula regular, checagem rápida de conceito",
  optionCount: 4,
  contextPolicy: "none",
  // Baixa: questão direta, prioriza precisão sobre criatividade.
  temperature: 0.2,

  guide: `ESTILO: Simples e objetivo. Cada questão é uma pergunta direta sobre um
conceito apresentado no material.

- Enunciado em 1-2 frases, claro e sem floreio.
- Sem parágrafo de contexto — "context" deve ser string vazia "".
- Vocabulário adequado ao nível do material.
- Evite perguntas retóricas ou ambiguidades.

Exemplos de enunciado BOM:
  "Qual é a principal função da fotossíntese nas plantas?"
  "Em uma função linear $f(x) = 2x + 3$, qual é o valor de $f(5)$?"

Exemplos de enunciado RUIM (não faça):
  "O que podemos afirmar sobre..." (genérico demais)
  "Assinale a alternativa correta." (sem pergunta específica)`,

  distractorPattern: `Distratores DESTE ESTILO:
- Plausíveis. Representam confusões conceituais comuns (ex: trocar causa por
  consequência, confundir conceito vizinho).
- Todos no mesmo tipo: se a correta é um nome, os distratores também são
  nomes; se é uma fórmula, todos são fórmulas.
- Extensão similar (nunca a correta visivelmente mais longa que as outras).`,

  explanationPattern: `Explanation DESTE ESTILO:
- 1 a 2 frases curtas.
- Diga POR QUE a correta está correta e nomeie o conceito aplicado.
- Não precisa explicar por que cada distrator falha — no simple, foco na correta.`,
};
