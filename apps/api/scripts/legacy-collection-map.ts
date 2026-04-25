// Mapeamento canônico entre nomes das collections legacy (Mongoose plural
// lowercase default) e o prefixo `legacy_*` adotado pra isolá-las do
// monorepo. Usado pelo script de rename E pelas fases de migração.
//
// Não alterar sem migração coordenada dos dois scripts.

export interface LegacyPair {
  original: string;
  renamed: string;
}

export const LEGACY_COLLECTIONS: LegacyPair[] = [
  { original: "users", renamed: "legacy_users" },
  { original: "classes", renamed: "legacy_classes" },
  { original: "exams", renamed: "legacy_exams" },
  { original: "students", renamed: "legacy_students" },
  { original: "results", renamed: "legacy_results" },
  { original: "scanresults", renamed: "legacy_scanresults" },
  { original: "integrations", renamed: "legacy_integrations" },
];

// Atalhos pra não decorar o nome com `legacy_` em cada fase.
export const LEGACY = {
  users: "legacy_users",
  classes: "legacy_classes",
  exams: "legacy_exams",
  students: "legacy_students",
  results: "legacy_results",
  scanresults: "legacy_scanresults",
  integrations: "legacy_integrations",
} as const;
