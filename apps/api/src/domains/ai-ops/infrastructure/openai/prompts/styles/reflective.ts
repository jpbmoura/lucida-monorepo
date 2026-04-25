import type { StyleSpec } from "../types.js";

export const reflectiveStyle: StyleSpec = {
  key: "reflective",
  label: "Reflexiva (metacognitiva)",
  target:
    "materiais não-canônicos (livros, artigos, documentários, textos culturais) onde a ideia central importa mais que fatos isolados",
  optionCount: 4,
  contextPolicy: "required",

  guide: `ESTILO: Reflexiva. Questões desenhadas pra provocar reflexão sobre o
conteúdo, não pra checar memorização. O objetivo é fazer o aluno perceber
se ele realmente ENTENDEU a ideia central do material, ou se só passou os
olhos.

Pergunte sobre:
- Implicações (o que segue disso que foi dito?).
- Conexões (como esse ponto se relaciona com outro do material?).
- Interpretações (o que o autor/material está sugerindo, além do literal?).
- Aplicações ao mundo real (se esse conceito é verdadeiro, então...).
- Contraste (se isso é X, então não é Y — qual Y?).

Regras do contexto:
- 2 a 4 frases. Pode ser uma citação curta do material, uma paráfrase de
  uma ideia central, ou uma descrição compacta de uma cena que o material
  apresenta.
- NÃO repete o material inteiro — é um ponto de partida pra reflexão.

CASAMENTO DE CONTEÚDO (regra crítica deste estilo):
O TIPO de questão deve CORRESPONDER AO TIPO DO MATERIAL.
- Material científico → pergunta sobre implicação científica, cadeia causal,
  método.
- Material cultural/humanístico → pergunta sobre interpretação, valor,
  analogia, contexto histórico.
- Material filosófico → pergunta sobre consequência lógica, contraste entre
  posições, coerência interna.
- Material técnico/prático → pergunta sobre aplicação, transferência pra
  situação nova.

NÃO gere questão de cálculo numérico em material cultural. NÃO gere questão
de interpretação literária em material científico rígido. Respeite o domínio
do material.

Regras do enunciado:
- 1 a 2 frases. Começa tipicamente com "Qual a implicação de...", "O que é
  coerente afirmar sobre...", "Qual conclusão se alinha ao argumento de...".
- Nunca uma pergunta de memória factual ("em que ano...", "quem foi o
  primeiro...").`,

  distractorPattern: `Distratores DESTE ESTILO:
- Representam INTERPRETAÇÕES SUPERFICIAIS do material. O aluno que leu mas
  não refletiu cairia nelas.
- Um dos distratores deve ser uma interpretação LITERAL demais (pegando só
  o que foi dito literalmente, sem considerar a implicação).
- Outro deve ser uma interpretação EXCESSIVA (extrapolando além do que o
  material sustenta).
- Nunca distratores absurdos — todos devem ser leituras defensáveis do
  material, só não a melhor.`,

  explanationPattern: `Explanation DESTE ESTILO:
- 2 a 3 frases.
- Conecte a alternativa correta à ideia central do material.
- Mostre a RELAÇÃO que o aluno deveria ter percebido.
- Evite jargão de "interpretação" ou "metacognição" — fale do conteúdo.`,
};
