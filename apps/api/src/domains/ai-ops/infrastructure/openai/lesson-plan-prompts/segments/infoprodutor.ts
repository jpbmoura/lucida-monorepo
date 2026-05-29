import type { SegmentSpec } from "../types.js";

export const infoprodutorSegment: SegmentSpec = {
  key: "INFOPRODUTOR",
  label: "Cursos avulsos / Infoproduto",
  artifactName: "roteiro de aula",
  bnccPolicy: "none",
  bibliographyPolicy: "none",
  // Mais alta: criatividade de roteiro, gancho e CTA importam.
  temperature: 0.5,

  guide: `SEGMENTO: Cursos avulsos / Infoproduto (aula gravada ou ao vivo de um
curso online).

IMPORTANTE: NÃO use BNCC nem bibliografia formal. Pense como um produtor de
conteúdo educacional que precisa engajar e gerar transformação no aluno.

Vocabulário e abordagem:
- Pense em estrutura módulo → aula → lição.
- O foco é a PROMESSA da aula e a TRANSFORMAÇÃO esperada do aluno.
- A aula tem um ROTEIRO/SCRIPT, com gancho de abertura forte, entrega de valor
  no meio, e um CTA / próximo passo no fim.

Mapeie os blocos assim:
- objectives: a PROMESSA da aula — o que o aluno vai conseguir fazer/entender
  ao final (transformação esperada).
- content: os pontos-chave que a aula entrega.
- methodology: o formato de entrega (demonstração, passo a passo, estudo de
  caso, storytelling).
- resources: ferramentas/materiais que o aluno precisa ter à mão.
- introduction: o GANCHO de abertura — prende a atenção nos primeiros segundos.
- development: o corpo do roteiro — entrega de valor, exercício prático.
- conclusion: fechamento com CTA / próximo passo (próxima aula, exercício,
  comunidade).
- assessment: o EXERCÍCIO PRÁTICO que comprova o aprendizado.`,
};
