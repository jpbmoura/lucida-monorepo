import type { OutputLanguage } from "../../../domain/generation-types.js";
import type { SlideTone } from "../../../domain/slide-generation-types.js";
import { languageName, languageRule } from "../prompts/shared/language.js";

// Registro do deck: didático e neutro em pt-BR. SEM persona de marca (sem a
// "Lulu") — o deck é do professor, não da Lucida.
export const SLIDE_INTRO = `Você é um designer instrucional especialista em criar apresentações de aula
claras, elegantes e pedagogicamente sólidas para professores brasileiros. A
partir do material e do contexto fornecidos, você projeta um deck de slides:
conteúdo enxuto, bem hierarquizado e com um arco de aula coerente.

Você produz CONTEÚDO + esquema de layout — NUNCA HTML, CSS ou markup. A
aparência (cores, fontes) é aplicada depois por um tema; seu trabalho é o
conteúdo e a escolha do tipo de cada slide.`;

// Regras de ouro do slide (equivalente ao golden-rules das provas, adaptado ao
// registro de apresentação). Reusa languageRule pra coerência de idioma.
export function buildSlideGoldenRules(language: OutputLanguage): string {
  return `REGRAS GERAIS:
- Registro didático e neutro. Sem voz de marketing, sem "nós da Lucida", sem
  meta-referências ("neste slide vamos..."). Fale o conteúdo direto.
- NUNCA copie frases do material verbatim. Reescreva com suas palavras, de
  forma concisa e clara para projeção.
- Sem emojis. Sem siglas internas. Sem links.
- Cada slide deve ter conteúdo real e específico do tema — nada de frases
  genéricas que serviriam pra qualquer aula.

${languageRule(language)}`;
}

const TONE_GUIDE: Record<SlideTone, string> = {
  didatico:
    "Tom didático e direto: explica com clareza, como um bom professor em sala.",
  descontraido:
    "Tom descontraído e próximo: linguagem leve e acessível, sem perder a precisão.",
  formal:
    "Tom formal e acadêmico: vocabulário preciso, impessoal, adequado ao ensino superior.",
  inspirador:
    "Tom inspirador: desperta curiosidade e mostra a relevância do tema, sem exagero.",
};

export function toneGuide(tone: SlideTone): string {
  return `TOM DA ESCRITA: ${TONE_GUIDE[tone]}`;
}

// Reforço de idioma quando a saída não é pt-BR.
export function slideLanguageReminder(language: OutputLanguage): string {
  if (language === "pt-BR") return "";
  return `\n\nIMPORTANTE: todo o texto voltado ao aluno (títulos, subtítulos,
parágrafos, bullets, callouts, notas) deve estar em ${languageName(language)}.`;
}

// Contrato de saída do OUTLINE (1ª chamada) — em linguagem natural. O schema
// estrutural (strict) vive no gerador.
export const OUTLINE_OUTPUT_CONTRACT = `FORMATO DE SAÍDA (JSON) — o ROTEIRO do deck:
- "title": título da apresentação. Se foi informado, repita-o; se veio em
  branco, crie um título claro a partir do material/tema.
- "subject": a disciplina/área. Se informada, repita; se em branco, INFIRA.
- "gradeLevel": o ano/série/período. Se informado, repita; se em branco, INFIRA.
- "suggestedTheme": 1 dos 5 temas, conforme a regra de sugestão de tema.
- "slides": a lista ORDENADA de slides do deck, exatamente na quantidade pedida.
  Cada item tem:
  - "type": o tipo do slide (um dos 9 tipos).
  - "title": o título do slide (≤ 8 palavras).
  - "intent": uma frase curta (interna, não vai pro slide) dizendo qual é a
    ÚNICA ideia daquele slide e seu papel no arco da aula.
  - "needsImage": true só se uma imagem agrega àquele slide (ver critério de
    imagem).

Distribua o conteúdo seguindo o ARCO PEDAGÓGICO: comece com capa + gancho,
construa o conceito em passos (uma ideia por slide) e feche com síntese.`;

// Contrato de saída de UM slide (2ª chamada, por slide).
export const SLIDE_OUTPUT_CONTRACT = `FORMATO DE SAÍDA (JSON) — UM slide completo:
- "title": título do slide (≤ 8 palavras).
- "subtitle": subtítulo curto, ou "" se não houver.
- "blocks": lista de blocos de conteúdo. Cada bloco tem "kind" e os campos
  daquele kind (os demais campos vão vazios):
  - kind "paragraph": "text" (≤ ~40 palavras) e "emphasis" (true pra destaque).
  - kind "bullets": "items" (≤ 5 itens, ≤ ~12 palavras cada).
  - kind "formula": "latex" (LaTeX puro, SEM cifrão).
  - kind "callout": "text" e "variant" ("term" | "note" | "example" | "warning").
- "columns": só para "two-column" e "comparison" — EXATAMENTE 2 colunas, cada
  uma com "heading" (rótulo, ou "") e "blocks". Para os outros tipos, [].
- "image": SEMPRE presente. "query" (cena em inglês, substantivos concretos),
  "required" (true só se a imagem agrega), "alt" (descrição em pt-BR). Se não
  precisar de imagem, required=false e query="".
- "notes": fala do apresentador, ou "" quando não pedido.
- "bnccCodes": códigos BNCC pertinentes (ex: "EF09MA09"), ou [] quando não se
  aplica.

Respeite o ORÇAMENTO DE TEXTO e o FOCO VISUAL do tipo de slide.`;
