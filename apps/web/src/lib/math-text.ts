// Tolerância de notação matemática — "suspensório" do render.
//
// O modelo (e provas legadas já salvas) emite math de formas inconsistentes:
// `\( ... \)`, `\[ ... \]`, `$ ... $`, `$$ ... $$` ou ambientes LaTeX soltos
// (`\begin{pmatrix} ... \end{pmatrix}`) sem delimitador nenhum. Aqui
// normalizamos tudo pra `$`/`$$` e tokenizamos pro <RichText> renderizar.
// Render-side tolera qualquer drift; o generator no backend também
// normaliza pra manter o dado salvo limpo (Word export etc).

const BARE_ENV =
  /(?<![$\\])(\\begin\{(pmatrix|bmatrix|vmatrix|Vmatrix|Bmatrix|matrix|cases|array|aligned|align|equation)\}[\s\S]*?\\end\{\2\})(?![$])/g;

/** Converte delimitadores soltos pra `$`/`$$` e envolve ambientes nus. */
export function normalizeMathDelimiters(input: string): string {
  if (!input) return input;
  let s = input;
  // \[ \]  → $$ $$   (bloco)   |   \( \) → $ $ (inline)
  s = s.replace(/\\\[/g, "$$$$").replace(/\\\]/g, "$$$$");
  s = s.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
  // Ambiente LaTeX nu (sem nenhum delimitador) → bloco. Só quando NÃO há
  // `$` na string: se o modelo usou delimitador, o ambiente já está dentro
  // dele — embrulhar de novo geraria `$ $$…$$ $` e quebraria o parse.
  if (!s.includes("$")) {
    s = s.replace(BARE_ENV, "$$$$$1$$$$");
  }
  return s;
}

// Moeda em pt-BR ("R$ 5,00", "US$ 10") tem `$` colado numa letra. Esse `$`
// NUNCA é delimitador de math — o prompt manda usar `$` só pra matemática,
// e math nunca vem colado numa letra (vem após espaço/início/pontuação).
function isCurrencyDollar(s: string, i: number): boolean {
  const prev = s[i - 1];
  return prev !== undefined && /[A-Za-z]/.test(prev);
}

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string };

/**
 * Quebra a string em segmentos texto / math inline (`$…$`) / math bloco
 * (`$$…$$`). `\$` é tratado como cifrão literal. Delimitador sem par é
 * devolvido como texto (não engole o resto da string).
 */
export function tokenizeMath(input: string): MathSegment[] {
  const s = normalizeMathDelimiters(input ?? "");
  const segments: MathSegment[] = [];
  let text = "";
  let i = 0;

  const flushText = () => {
    if (text) {
      segments.push({ type: "text", value: text });
      text = "";
    }
  };

  while (i < s.length) {
    // Cifrão escapado → literal.
    if (s[i] === "\\" && s[i + 1] === "$") {
      text += "$";
      i += 2;
      continue;
    }
    if (s[i] === "$") {
      // "R$ 5,00" — cifrão de moeda, não de math.
      if (isCurrencyDollar(s, i)) {
        text += s[i];
        i += 1;
        continue;
      }
      const isBlock = s[i + 1] === "$";
      const delim = isBlock ? "$$" : "$";
      const close = s.indexOf(delim, i + delim.length);
      if (close === -1) {
        // Sem fechamento — não é math, devolve cru como texto.
        text += s.slice(i);
        break;
      }
      const value = s.slice(i + delim.length, close).trim();
      if (value) {
        flushText();
        segments.push({ type: isBlock ? "block" : "inline", value });
      }
      i = close + delim.length;
      continue;
    }
    text += s[i];
    i += 1;
  }
  flushText();
  return segments;
}
