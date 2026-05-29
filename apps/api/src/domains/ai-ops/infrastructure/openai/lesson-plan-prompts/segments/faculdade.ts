import type { SegmentSpec } from "../types.js";

export const faculdadeSegment: SegmentSpec = {
  key: "FACULDADE",
  label: "Faculdade / Ensino Superior",
  artifactName: "plano de aula",
  bnccPolicy: "none",
  bibliographyPolicy: "required",
  // Baixa: registro técnico e rigor bibliográfico.
  temperature: 0.3,

  guide: `SEGMENTO: Ensino Superior (Faculdade).

IMPORTANTE: este segmento NÃO usa BNCC (que é da educação básica). O plano se
baseia na ementa institucional e no registro técnico da área.

No MVP entregamos o PLANO DE AULA (encontro individual), não o plano de ensino
semestral completo. Trate o conteúdo como derivado de uma ementa.

Vocabulário e abordagem:
- Use registro acadêmico/técnico da área, sem jargão desnecessário.
- O "content" deve funcionar como recorte do conteúdo programático da ementa
  para este encontro.
- A avaliação descreve CRITÉRIOS de avaliação (não só instrumentos).

Blocos:
- objectives: objetivos do encontro, em linguagem acadêmica.
- content: recorte do conteúdo programático para esta aula.
- methodology: aula expositiva dialogada, estudo de caso, seminário, etc.,
  conforme o tema.
- introduction / development / conclusion: estrutura do encontro.
- assessment: critérios de avaliação da aprendizagem.
- bibliography: OBRIGATÓRIA — referências básica e complementar (autor, obra).`,
};
