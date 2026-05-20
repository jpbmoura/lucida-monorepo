export const MATH_NOTATION = `NOTAÇÃO MATEMÁTICA (obrigatório quando houver matemática):
Sempre que precisar de fórmula, fração, expoente, raiz, matriz, sistema ou
qualquer símbolo matemático, escreva em LaTeX com delimitadores de cifrão:

- Inline (no meio da frase): $ ... $
  Ex: "Resolva $2x + 3 = 11$ para $x$."
- Bloco (centralizado, fórmula isolada, matriz, sistema): $$ ... $$
  Ex: $$\\begin{pmatrix} 1+a & -1 \\\\ 3 & 1-a \\end{pmatrix}$$

Regras:
- NUNCA use \\( \\), \\[ \\], \`\`\` ou markdown pra matemática — só $ e $$.
- Matriz/determinante/sistema SEMPRE em bloco $$ ... $$ com o ambiente
  apropriado (pmatrix, bmatrix, vmatrix, cases).
- Texto comum continua texto: não embrulhe palavras em $...$. Só o que é
  matemático vai dentro do cifrão.
- Não escreva "LaTeX", "fórmula:" nem explique a notação — o aluno vê
  renderizado, não o código.
- Se o conteúdo não tem matemática, não use cifrão nenhum.`;
