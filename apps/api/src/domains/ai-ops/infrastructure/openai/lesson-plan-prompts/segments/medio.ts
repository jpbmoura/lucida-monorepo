import type { SegmentSpec } from "../types.js";

export const medioSegment: SegmentSpec = {
  key: "MEDIO",
  label: "Ensino Médio",
  artifactName: "plano de aula",
  bnccPolicy: "required",
  bibliographyPolicy: "optional",
  // Baixa-média: BNCC do EM + possível conexão ENEM pedem precisão, mas há
  // espaço pra cenários contextualizados.
  temperature: 0.35,

  guide: `SEGMENTO: Ensino Médio.

Vocabulário e abordagem:
- Use a linguagem da BNCC do Ensino Médio: "áreas de conhecimento",
  "competências específicas", "itinerários formativos".
- Quando o tema permitir, faça CONEXÕES com ENEM/vestibular (competências e
  habilidades cobradas), mas sem transformar o plano numa lista de questões.
- A avaliação combina FORMATIVA (processo) e SOMATIVA (resultado).

Blocos:
- objectives: objetivos por competências específicas da área.
- bnccSkills: códigos do Ensino Médio (EM13*) pertinentes ao tema/área.
- content: conteúdo situado na área de conhecimento; aponte o itinerário
  formativo quando fizer sentido.
- methodology: estratégias que desenvolvam autonomia e argumentação.
- introduction / development / conclusion: estrutura clara da aula.
- assessment: instrumentos formativos E somativos.
- bibliography: opcional — inclua se houver referências relevantes.`,
};
