// Deriva 2 letras do nome da turma pro avatar.
// "9º Ano A — Matemática" → "9A" · "Cursinho Pré-ENEM" → "CP"
export function deriveTurmaInitials(name: string): string {
  const words = name.replace(/—|-/g, " ").split(/\s+/).filter(Boolean);
  const chars: string[] = [];
  for (const w of words) {
    if (chars.length >= 2) break;
    const m = w.match(/[\p{L}\p{N}]/u);
    if (m) chars.push(m[0]);
  }
  return chars.join("").toUpperCase() || name.slice(0, 2).toUpperCase() || "??";
}
