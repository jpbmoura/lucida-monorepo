import type { StyleSpec } from "../types.js";

export const contextualStyle: StyleSpec = {
  key: "contextual",
  label: "Contextual (estilo ENEM)",
  target: "vestibular ENEM e simulados de ensino médio",
  optionCount: 5,
  contextPolicy: "required",

  guide: `ESTILO: Contextual (inspirado no ENEM). Cada questão começa com um
parágrafo de contexto ("context") que situa o aluno numa cena real,
interpretação de dado, notícia, citação histórica, analogia cotidiana ou
cenário cotidiano brasileiro. Depois vem o enunciado, exigindo interpretar
o contexto E aplicar um conceito do material.

Regras do contexto:
- 2 a 5 frases. Não mais curto que isso, não um parágrafo inteiro.
- O contexto NÃO contém a resposta literal. Ele é um CENÁRIO que demanda
  aplicação do conceito. (Ver REGRA DE OURO.)
- Evite citar o material explicitamente. Trate o contexto como uma cena
  autocontida.
- Interdisciplinar quando fizer sentido — ENEM de verdade mistura áreas.
  Ex: um problema de função linear num cenário de economia doméstica;
  uma pergunta sobre ecossistema num recorte de notícia ambiental.
- Realidade brasileira preferida: prefira nomes, cidades, dados e marcas
  brasileiras quando o tema permitir.

Estrutura típica:
  context: "Um produtor rural da região do Cerrado observa que, após anos
    de plantio intensivo de soja, a produtividade por hectare vem caindo
    apesar do uso crescente de fertilizantes."
  statement: "Qual fenômeno biológico melhor explica essa queda?"

Regras do enunciado:
- 1 a 3 frases.
- Pergunta direta sobre o cenário do contexto.
- Não repita informação do contexto literalmente no enunciado.`,

  distractorPattern: `Distratores DESTE ESTILO:
- Cada distrator representa uma INTERPRETAÇÃO PARCIAL do contexto. Um aluno
  que leu o cenário de forma apressada, captou só metade do problema, cairia
  nele.
- Não são conceitos totalmente errados — são conceitos que RELACIONAM ao
  cenário mas não são a melhor explicação.
- Inclua pelo menos 1 distrator que corresponda a uma "conclusão óbvia mas
  incompleta" do cenário.`,

  explanationPattern: `Explanation DESTE ESTILO:
- 2 a 3 frases.
- Primeira frase: como o contexto leva à alternativa correta.
- Segunda frase: por que UM dos distratores plausíveis falha (escolha o mais
  tentador).
- NÃO mencione "contexto" nem "interpretação" como meta-conceito — fale do
  conteúdo em si.`,
};
