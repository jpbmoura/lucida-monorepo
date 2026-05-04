export interface DisplayUser {
  name: string;
  firstName: string;
  email: string;
  initials: string;
}

// Centraliza fallback de nome quando a conta não tem `name` cadastrado.
// `fallback`:
//  - "professor" (default): genérico — apropriado pra greeting/topbar/menu
//    do próprio user logado ("Olá Professor").
//  - "email": usa o email como nome — apropriado pra **listagens de outros
//    users** (membros, staff, picker, etc), onde "Professor" igualaria
//    todo mundo.
export function buildDisplayUser(input: {
  name: string | null;
  email: string;
  fallback?: "professor" | "email";
}): DisplayUser {
  const trimmed = input.name?.trim() ?? "";
  const hasName = trimmed.length > 0;
  const fallbackName =
    input.fallback === "email" ? input.email : "Professor";
  const name = hasName ? trimmed : fallbackName;
  const firstName = name.split(/\s+/)[0] ?? name;

  const source = hasName ? trimmed : input.email.split("@")[0] ?? "PR";
  const words = source.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
      : source.slice(0, 2).toUpperCase();

  return { name, firstName, email: input.email, initials };
}
