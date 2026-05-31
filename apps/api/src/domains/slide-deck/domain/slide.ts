// Modelo de conteúdo de um slide — TS puro, sem Zod (domínio é independente de
// framework). A IA gera CONTEÚDO + esquema de layout (nunca HTML cru): cada
// slide é um `type` + uma lista de blocos tipados, e o front renderiza com o
// tema escolhido. É o que mantém liberdade de composição, PPTX fiel e beleza
// consistente. Os schemas Zod que validam isso (na geração e nas requests)
// espelham estes tipos nas camadas de infraestrutura/apresentação.

// Os 9 tipos de slide. Cada um mapeia pra um componente de layout no front; o
// tema só fornece cores/fontes/decoração.
export type SlideType =
  | "cover"
  | "section"
  | "content"
  | "two-column"
  | "comparison"
  | "quote"
  | "formula"
  | "activity"
  | "summary";

// Variantes do bloco callout — destaque com intenção pedagógica.
export type CalloutVariant = "term" | "note" | "example" | "warning";

// Blocos tipados que compõem um slide. Discriminados por `kind`.
export interface ParagraphBlock {
  kind: "paragraph";
  text: string;
  /** Ênfase visual (lead/destaque); o tema decide como. */
  emphasis: boolean;
}

export interface BulletsBlock {
  kind: "bullets";
  items: string[];
}

export interface FormulaBlock {
  kind: "formula";
  /** LaTeX puro (sem delimitadores); o front renderiza via KaTeX. */
  latex: string;
}

export interface CalloutBlock {
  kind: "callout";
  text: string;
  variant: CalloutVariant;
}

export type SlideBlock =
  | ParagraphBlock
  | BulletsBlock
  | FormulaBlock
  | CalloutBlock;

// Coluna usada pelos layouts `two-column` e `comparison` (exatamente 2). Para
// os demais tipos, `columns` fica vazio e o conteúdo vive em `blocks`.
export interface SlideColumn {
  heading: string | null;
  blocks: SlideBlock[];
}

// Imagem do slide. Na geração a IA só preenche a parte de BUSCA
// (query/required/alt); os campos resolvidos (url/crédito) são preenchidos
// depois pelo ImageProvider (Pexels). Guardamos a URL original + crédito do
// fotógrafo pra atribuição/conformidade — não exibidos no deck.
export interface SlideImage {
  /** Descrição da cena em inglês (substantivos concretos) — o Pexels responde melhor assim. */
  query: string;
  /** Se a IA julgou que a imagem agrega (concreto/mundo real). */
  required: boolean;
  alt: string;
  // Resolvidos pós-busca (null enquanto não resolvidos / sem PEXELS_API_KEY):
  url: string | null;
  thumbUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  /** Página do Pexels (atribuição). */
  sourceUrl: string | null;
}

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  subtitle: string | null;
  blocks: SlideBlock[];
  /** Só preenchido em `two-column`/`comparison` (2 colunas). Senão, vazio. */
  columns: SlideColumn[];
  image: SlideImage | null;
  /** Fala do apresentador (opcional — só quando o toggle está ligado). */
  notes: string | null;
  /** Códigos BNCC (quando a fonte é um plano de aula). */
  bnccCodes: string[];
}
