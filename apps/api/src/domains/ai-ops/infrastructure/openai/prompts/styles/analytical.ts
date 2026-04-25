import type { StyleSpec } from "../types.js";

// TODO (próxima rodada): implementar formato de asserção (I/II/III/IV com
// combinações em "É correto o que se afirma em: II e III apenas") que é
// o formato mais distintivo do ENADE real. Hoje usamos MC convencional com 5
// opções. Envolve ajustar shape de questão no domain + editor + correção.

export const analyticalStyle: StyleSpec = {
  key: "analytical",
  label: "Analítica (estilo ENADE)",
  target: "ensino superior, prova de curso, avaliação de especialização",
  optionCount: 5,
  contextPolicy: "required",

  guide: `ESTILO: Analítico (inspirado no ENADE). Cada questão exige raciocínio em
múltiplos passos. O aluno precisa ler um cenário profissional ou conceitual,
aplicar conhecimentos do material e chegar à resposta por análise — não por
memória.

Regras do contexto:
- 3 a 8 frases. Pode incluir dados específicos (números, percentuais,
  pequena tabela descrita em texto), citações conceituais, ou um caso real
  da área.
- O contexto é um CASO, não uma explicação teórica. Não ensine o conceito
  no contexto — apenas apresente o cenário onde o conceito precisa ser
  aplicado.
- Registro técnico da área. Use terminologia específica quando apropriado.
  Ex: não "plano de pagamento" mas "fluxo de caixa projetado"; não "lei"
  mas "norma técnica" quando referente a NBR.
- Realidade brasileira e institucional: prefira contextos do SUS, do setor
  público brasileiro, de empresas brasileiras ou de normas nacionais (ABNT,
  INEP, CONAMA) quando o tema permitir.

Regras do enunciado:
- 1 a 3 frases.
- Pergunta analítica: "qual a relação entre...", "qual a melhor explicação
  para...", "que conclusão é correta diante de...".
- Evite perguntas de localização ("qual o valor de X mencionado acima"). O
  enunciado deve demandar raciocínio além da leitura.

Estrutura típica:
  context: "Uma construtora iniciou uma obra em terreno argiloso mole sem
    realizar sondagem SPT prévia. Três meses após o início, surgiram
    rachaduras horizontais na alvenaria do pavimento térreo e o piso
    apresentou desnível de 3cm em uma extensão de 8m. A equipe técnica
    suspeita de problema geotécnico."
  statement: "Qual a explicação mais provável para o quadro descrito?"`,

  distractorPattern: `Distratores DESTE ESTILO:
- Representam ERROS DE RACIOCÍNIO CONCRETOS. Pense: "qual conceito parecido
  um aluno aplicaria incorretamente aqui?"
- Cada distrator deve ser identificável como "erro X" — usou a fórmula
  errada, confundiu causa com efeito, aplicou a regra fora do escopo, ignorou
  uma variável relevante, etc.
- Inclua pelo menos 1 distrator que seria ACEITÁVEL numa análise superficial
  mas falha quando se considera um detalhe específico do contexto.
- No nível "difícil", os distratores devem ser SOFISTICADOS — o próprio
  enunciado deve deixar margem pra mais de uma conclusão plausível, e a
  correta é a mais completa.`,

  explanationPattern: `Explanation DESTE ESTILO:
- 3 a 4 frases. Passo-a-passo do raciocínio.
- Primeira frase: qual conceito do material se aplica ao caso.
- Segunda frase: como o cenário encaixa no conceito.
- Terceira frase: por que a correta é a melhor resposta.
- Quarta frase (opcional): qual distrator é o "quase certo" e por que falha.
- Pode citar norma técnica, autor ou conceito por nome quando relevante.`,
};
