import type { OutputLanguage } from "../../../../domain/generation-types.js";

// Fonte única das strings dependentes de idioma. As INSTRUÇÕES do prompt
// continuam em pt-BR (o modelo segue bem); só o idioma de SAÍDA muda. Por isso
// as diretivas abaixo são escritas em pt mesmo quando pedem output en/es.

// Nome do idioma alvo, em português, pra usar dentro das instruções.
const LANGUAGE_NAME: Record<OutputLanguage, string> = {
  "pt-BR": "português do Brasil",
  en: "inglês",
  es: "espanhol",
};

export function languageName(language: OutputLanguage): string {
  return LANGUAGE_NAME[language];
}

// Rótulos canônicos das opções de Verdadeiro/Falso por idioma. Correção é por
// índice (correctAnswer), então isto é só display — mas deve sair no idioma da
// prova. Usado tanto no prompt (output-contract) quanto na canonização do
// gerador, pra os literais baterem.
const TRUE_FALSE_LABELS: Record<OutputLanguage, [string, string]> = {
  "pt-BR": ["Verdadeiro", "Falso"],
  en: ["True", "False"],
  es: ["Verdadero", "Falso"],
};

export function trueFalseLabels(language: OutputLanguage): [string, string] {
  return TRUE_FALSE_LABELS[language];
}

// Parágrafo "LÍNGUA:" do golden-rules. Em pt-BR adapta à realidade brasileira;
// nos outros idiomas, força o output e neutraliza a adaptação brasileira.
export function languageRule(language: OutputLanguage): string {
  if (language === "pt-BR") {
    return `LÍNGUA: Português do Brasil. Adapte exemplos, nomes próprios e cenários pra
realidade brasileira quando fizer sentido (ex: prefira "Maria" a "Mary", "o
SUS" a "o NHS", reais a dólares). Evite anglicismos se o equivalente em
pt-BR for claro.`;
  }
  const name = LANGUAGE_NAME[language];
  return `LÍNGUA: ${name}. Escreva TODO o conteúdo voltado ao aluno (enunciado,
contexto, opções e explicação) em ${name} natural e fluente. Use nomes próprios
e cenários neutros/internacionais. IGNORE qualquer instrução anterior de adaptar
à realidade brasileira — não escreva nada em português.`;
}

// Última linha do output-contract (formato de saída). Em pt-BR é a regra
// original; nos outros idiomas reforça o idioma e protege o enum `difficulty`.
export function outputLanguageLine(language: OutputLanguage): string {
  if (language === "pt-BR") {
    return "Todas as strings em português do Brasil.";
  }
  const name = LANGUAGE_NAME[language];
  return `"statement", "context", "options" e "explanation" em ${name}. O campo "difficulty" mantém EXATAMENTE os valores do schema ("fácil" | "médio" | "difícil"), sem traduzir.`;
}
