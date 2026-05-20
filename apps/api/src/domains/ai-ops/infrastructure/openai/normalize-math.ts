// Normaliza notação matemática vinda da IA pra `$`/`$$` antes de salvar.
// "Suspensório" do contrato de prompt (MATH_NOTATION): mesmo instruído a
// usar cifrão, o modelo às vezes escapa pra `\( \)`, `\[ \]` ou ambiente
// LaTeX nu. Guardar limpo mantém consistência e ajuda superfícies que não
// renderizam KaTeX (ex: export Word). O render no web tolera o mesmo drift.

const BARE_ENV =
  /(?<![$\\])(\\begin\{(pmatrix|bmatrix|vmatrix|Vmatrix|Bmatrix|matrix|cases|array|aligned|align|equation)\}[\s\S]*?\\end\{\2\})(?![$])/g;

export function normalizeMathDelimiters(input: string): string {
  if (!input) return input;
  let s = input;
  s = s.replace(/\\\[/g, "$$$$").replace(/\\\]/g, "$$$$");
  s = s.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
  // Só embrulha ambiente nu quando não há `$`: se o modelo usou delimitador,
  // o ambiente já está dentro dele — re-embrulhar geraria `$ $$…$$ $`.
  if (!s.includes("$")) {
    s = s.replace(BARE_ENV, "$$$$$1$$$$");
  }
  return s;
}
