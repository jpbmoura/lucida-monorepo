import type { OutputLanguage } from "../../../../domain/generation-types.js";
import { languageRule } from "./language.js";

export function buildGoldenRules(language: OutputLanguage): string {
  return `REGRA DE OURO — nunca copie a resposta do material:
A resposta correta NUNCA pode ser uma cópia textual (ou quase textual) do
material fornecido. Se o material traz a frase pronta que responderia a
pergunta, você deve REFORMULAR o enunciado ou o contexto pra exigir APLICAÇÃO
do conceito, não localização de trecho.

Exemplo do que NÃO fazer:
  Material: "A mitocôndria é a organela responsável pela respiração celular."
  Questão ruim: "Qual organela é responsável pela respiração celular?"
  Questão boa: "Uma célula com mitocôndrias defeituosas apresentaria
  prejuízo em qual processo?"

PROIBIÇÕES ABSOLUTAS:
- "Segundo o texto acima...", "De acordo com o material...", ou qualquer
  outra auto-referência ao material de apoio no enunciado.
- Usar "Todas as alternativas anteriores" ou "Nenhuma das anteriores" como
  opção correta.
- Pegadinhas gramaticais, trocadilhos irrelevantes ou alternativas com erro
  proposital de idioma.
- Emojis em qualquer campo.
- Siglas, códigos BNCC ou qualquer marca interna no conteúdo gerado.

${languageRule(language)}

VARIEDADE: Se gerar mais de uma questão, distribua os conceitos cobertos ao
longo do material — não concentre todas em um único trecho. Se o material
tem seções, tente cobrir seções diferentes.`;
}
