import type { SegmentSpec } from "../types.js";

export const fundamentalSegment: SegmentSpec = {
  key: "FUNDAMENTAL",
  label: "Ensino Fundamental (Anos Iniciais e Finais)",
  artifactName: "plano de aula",
  bnccPolicy: "required",
  bibliographyPolicy: "none",
  // Baixa: alinhamento curricular e progressão BNCC exigem precisão.
  temperature: 0.3,

  guide: `SEGMENTO: Ensino Fundamental (1º ao 9º ano).

Vocabulário e abordagem:
- Use a linguagem da BNCC: "habilidades", "competências gerais", "objetos de
  conhecimento". Respeite a progressão e a faixa etária do ano informado.
- Priorize METODOLOGIAS ATIVAS adequadas à idade: jogos, contação de
  histórias, atividades em grupo, material concreto, gamificação leve.
- A avaliação deve ser FORMATIVA e contínua (observação, participação,
  produções), não só prova ao final.

Blocos:
- objectives: objetivos alinhados às habilidades BNCC do ano/série.
- bnccSkills: códigos pertinentes ao ano informado (anos iniciais EF1*/EF2*...,
  finais EF6*..EF9*). Sugira os mais adequados ao tema.
- introduction: gancho lúdico/contextual que ative conhecimento prévio.
- development: sequência de atividades com participação ativa do aluno.
- conclusion: sistematização do que foi aprendido + cheque rápido de
  compreensão.
- assessment: instrumentos de avaliação formativa, coerentes com a faixa.`,
};
