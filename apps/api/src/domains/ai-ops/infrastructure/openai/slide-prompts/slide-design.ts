// Módulo de DESIGN DE SLIDE — o coração da qualidade do deck. É o que separa
// uma apresentação bonita de uma parede de texto. Aplica-se tanto ao
// planejamento do roteiro (outline) quanto à composição de cada slide.
//
// Nota de arquitetura: o brief pede pra reusar golden-rules / bloom-calibration
// das provas, mas aqueles módulos são escritos para QUESTÕES (falam de
// "alternativas", "distratores", "dificuldade da questão"). Injetá-los aqui
// diria ao modelo que ele está montando uma prova. Então reusamos verbatim só
// os módulos genéricos (injection-defense, math-notation, languageRule) e
// trazemos aqui o equivalente slide-específico: regras de ouro do slide + arco
// pedagógico (inspirado na progressão de Bloom).

export const SLIDE_DESIGN = `DESIGN DO SLIDE (regras de qualidade — siga à risca):

UMA IDEIA POR SLIDE:
- Cada slide carrega UMA ideia central. Se uma etapa do conteúdo tem várias
  ideias, divida em vários slides — nunca empilhe tudo num só.

ORÇAMENTO DE TEXTO (slide não é apostila — o conteúdo PRECISA caber na tela):
- Título: no máximo 8 palavras.
- No máximo 2 blocos por slide (ex.: 1 parágrafo curto + 1 lista; ou 1 lista; ou
  1 fórmula + 1 parágrafo). NUNCA mais que isso.
- Parágrafo: no máximo ~30 palavras (2 a 3 linhas). Prefira frases curtas.
- Bullets: no máximo 4 itens, cada um com no máximo ~10 palavras (1 linha).
- Some os limites: um slide inteiro não deve passar de ~55 palavras visíveis.
  Se o conteúdo não couber nesse orçamento, é sinal de que são DOIS slides.
- Não repita o título dentro dos blocos. Não escreva frases de transição vazias.

UM FOCO VISUAL POR SLIDE:
- Escolha o "type" e os "blocks" com INTENÇÃO — não jogue tudo como bullets.
- "cover": abertura do deck (título + subtítulo, pouco ou nenhum bloco).
- "section": divisória de seção/tema (título grande, opcional 1 parágrafo curto).
- "content": 1 ideia explicada (1 parágrafo OU até 5 bullets — raramente os dois).
- "two-column": duas facetas lado a lado (preencha "columns" com 2 colunas).
- "comparison": contraste A × B (preencha "columns" com 2 colunas rotuladas).
- "quote": uma citação/definição marcante (1 parágrafo em ênfase OU 1 callout).
- "formula": foco numa fórmula (bloco "formula" + 1 parágrafo curto de leitura).
- "activity": atividade/pergunta de saída (enunciado + o que o aluno faz).
- "summary": síntese de fechamento (poucos bullets recapitulando o essencial).

ARCO PEDAGÓGICO (inspirado na progressão de Bloom — lembrar → aplicar →
avaliar). O deck inteiro deve ter começo, meio e fim:
- ABERTURA: capa + um gancho/orientação que situa o aluno e desperta interesse.
- CONSTRUÇÃO: desenvolva o conceito em passos, do mais concreto ao mais
  abstrato, uma ideia por slide. Use exemplos antes de generalizações.
- FECHAMENTO: um slide de síntese e, quando pedido, um slide de atividade de
  saída que faça o aluno aplicar/avaliar o que viu.

IMAGEM COM CRITÉRIO:
- Peça imagem (image.required=true) só quando ela AGREGA: conceitos concretos,
  fenômenos do mundo real, contextos visuais. Para conteúdo abstrato ou
  matemático, image.required=false — confie na tipografia e nos blocos de
  fórmula.
- A "query" deve DESCREVER A CENA em inglês, com substantivos concretos (o
  Pexels responde melhor assim). NUNCA repita o título do slide como query.
  Ex (título "Função do 2º grau"): query "suspension bridge parabola arch", não
  "quadratic function".
- "alt" descreve a imagem em pt-BR (acessibilidade), em uma frase.

FÓRMULAS: toda matemática vai em bloco "formula" com LaTeX puro (sem
delimitadores de cifrão no campo "latex" — só a expressão).

CALLOUT — use a "variant" certa: "term" (definição de um termo), "note"
(observação importante), "example" (exemplo concreto), "warning" (cuidado/erro
comum).`;

// Sugestão de tema pela disciplina + série. A IA devolve "suggestedTheme" no
// outline; o front pré-seleciona, mas o professor pode trocar.
export const SLIDE_THEME_SUGGESTION = `SUGESTÃO DE TEMA ("suggestedTheme") — escolha 1 dos 5 pela combinação
disciplina + série/nível:
- "ludico": anos iniciais / infantil (formas amigáveis, lúdico).
- "minimo": ensino médio ou conteúdo denso (tipográfico, máximo respiro).
- "papel": exatas e ciências (sóbrio, foco em fórmula e leitura).
- "lousa": faculdade / sala escura / aula expositiva (fundo escuro).
- "vivido": humanas e línguas (ousado, expressivo, estilo keynote).`;
