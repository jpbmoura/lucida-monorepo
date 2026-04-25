export interface DisplayUser {
  name: string;
  firstName: string;
  email: string;
  initials: string;
}

// Centraliza fallback: "Professor" quando a sessão não tiver nome.
// Serve pro greeting, topbar, menu de perfil.
export function buildDisplayUser(input: {
  name: string | null;
  email: string;
}): DisplayUser {
  const trimmed = input.name?.trim() ?? "";
  const name = trimmed.length > 0 ? trimmed : "Professor";
  const firstName = name.split(/\s+/)[0] ?? name;

  const source = trimmed.length > 0 ? trimmed : input.email.split("@")[0] ?? "PR";
  const words = source.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
      : source.slice(0, 2).toUpperCase();

  return { name, firstName, email: input.email, initials };
}
