import "server-only";
import { createHighlighter, type Highlighter } from "shiki";

/**
 * Shiki singleton — um highlighter só por processo. Inicialização é
 * cara (carrega grammars WASM), mas depois cada chamada a `codeToHtml`
 * é síncrona e barata. Guardamos a Promise em vez da instância pra
 * evitar double-init durante a warm-up concorrente.
 */
let highlighterPromise: Promise<Highlighter> | null = null;

// Mapeia linguagens "humanas" usadas no CodeBlock pras grammars reais
// do Shiki. Evita carregar dezenas de grammars e documenta o que
// suportamos nas docs hoje. Adicionar nova linguagem = entrada aqui +
// incluir na lista de `langs` abaixo.
const LANGUAGE_MAP: Record<string, string> = {
  curl: "bash",
  bash: "bash",
  shell: "bash",
  sh: "bash",
  json: "json",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  node: "typescript",
  http: "http",
};

const SUPPORTED_LANGS = [
  "bash",
  "json",
  "javascript",
  "typescript",
  "http",
] as const;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      // `github-dark` é limpo, bem contrastado e neutro — não disputa
      // atenção com o roxo da paleta Analytics.
      themes: ["github-dark"],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighterPromise;
}

/**
 * Renderiza o código como HTML pré-highlighted. Se a linguagem não for
 * reconhecida, cai em `plaintext` — fica visualmente igual ao bloco
 * mono sem highlight, sem crash.
 *
 * O HTML retornado vem com um `<pre class="shiki ...">` com `background`
 * e `color` inline. A CSS do CodeBlock override o `background` pra
 * respeitar o wrapper (`bg-ink`) — assim o copy button e o header
 * combinam visualmente.
 */
export async function highlightCode(
  code: string,
  language: string | undefined,
): Promise<string> {
  const mapped = language
    ? (LANGUAGE_MAP[language.toLowerCase()] ?? "plaintext")
    : "plaintext";
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: mapped,
    theme: "github-dark",
  });
}
