# Estrutura de pastas

## Raiz do projeto Next.js

```
src/
  app/                       ← App Router: rotas, layouts, páginas, server actions de rota
    layout.tsx               ← root layout (fontes, provider de tema, toaster)
    page.tsx                 ← home
    (auth)/                  ← route group (não afeta URL)
      sign-in/page.tsx
    dashboard/
      layout.tsx             ← layout só do dashboard (sidebar etc)
      page.tsx
      exams/
        page.tsx             ← /dashboard/exams
        [id]/page.tsx        ← /dashboard/exams/:id
        new/
          page.tsx
          actions.ts         ← server actions específicas da rota
          schemas.ts         ← zod schemas compartilhados client/server
    api/                     ← só quando REALMENTE precisa de endpoint HTTP (webhooks)
  features/
    exam/                    ← código específico da feature Exam
      components/            ← componentes da feature (client ou server)
      actions.ts             ← server actions reutilizadas
      schemas.ts             ← zod schemas (fonte da verdade)
      queries.ts             ← TanStack Query hooks (se usar)
      store.ts               ← zustand store da feature (se tiver UI state)
      types.ts               ← tipos compartilhados
  components/
    ui/                      ← shadcn primitives customizados (button, input, dialog…)
    layout/                  ← Header, Footer, Sidebar, PageShell
    brand/                   ← Logo, BrandMark — artefatos de identidade visual
  lib/
    cn.ts                    ← wrapper de clsx + tailwind-merge
    fetcher.ts               ← fetch client auth + error handling
    format.ts                ← formatDate, formatCurrency, etc
  hooks/
    use-debounce.ts
    use-media-query.ts
  stores/
    use-ui-store.ts          ← stores globais (sidebar, modais, etc)
  server/
    auth.ts                  ← getSession, getUser — server only
    db.ts                    ← conexão/cliente
  styles/
    globals.css              ← @import tailwindcss + @theme com tokens
  middleware.ts              ← next middleware (auth redirect, etc)
```

## Convenções de nome

| Tipo | Arquivo | Export |
|---|---|---|
| Página App Router | `page.tsx` | `default async function Page()` |
| Layout | `layout.tsx` | `default function Layout({ children })` |
| Loading state | `loading.tsx` | `default function Loading()` |
| Error boundary | `error.tsx` | `default function Error()` (client component) |
| Not found | `not-found.tsx` | `default function NotFound()` |
| Componente | `exam-card.tsx` | `export function ExamCard()` |
| Hook | `use-debounce.ts` | `export function useDebounce()` |
| Store Zustand | `use-ui-store.ts` | `export const useUiStore` |
| Schema Zod | `schemas.ts` ou `<action>.schema.ts` | `export const createExamSchema` |
| Server action | `actions.ts` | `export async function createExam()` — com `"use server"` no topo |
| TanStack query hook | `queries.ts` | `export function useExamsQuery()` |

**Regras**:
- Arquivos em `kebab-case.tsx`. Um componente por arquivo (exceto componentes intimamente acoplados, ex: `Dialog` + `DialogTrigger` no mesmo arquivo).
- Componentes em `PascalCase`. Props em `camelCase`. Hooks em `useCamelCase`. Stores em `useCamelCaseStore`.
- **Sem prefixo `I`** em interfaces. `ExamCardProps`, não `IExamCardProps`.
- Server actions começam com verbo: `createExam`, `updateExam`, `deleteExam`.
- Zod schemas começam com o que representam: `createExamSchema` (input), `examSchema` (entidade completa).

## Feature folders vs. app folders

**Regra de polegada**:
- Código que aparece **só em uma rota** → fica na própria pasta da rota em `app/`.
- Código reutilizado **entre rotas** de uma mesma feature → `features/<feature>/`.
- Primitives realmente genéricos → `components/ui/` ou `components/layout/`.

Exemplo: um `<ExamCard />` usado no dashboard e na home? → `features/exam/components/exam-card.tsx`. O form `new-exam-form.tsx` só em `/dashboard/exams/new`? → `app/dashboard/exams/new/new-exam-form.tsx`.

**Não crie `features/`** no primeiro dia do projeto. Comece colocalizado em `app/`. Quando duplicar o terceiro componente entre rotas, aí promove para `features/`.

## Colocation vs separação

Mantenha tudo que muda junto, junto.

```
app/dashboard/exams/new/
  page.tsx            ← server component, chama o form
  new-exam-form.tsx   ← client component, usa RHF + Zod
  actions.ts          ← "use server"; server action createExam
  schemas.ts          ← zod; importado por ambos page/form/action
```

Quando schema, action e form vivem juntos, refatoração é uma pasta só. Quando espalha ("schemas no shared/", "actions no server/"), cada mudança vira arqueologia.

## Route groups e layouts aninhados

Use `(nome)` para agrupar rotas sem afetar URL:

```
app/
  (marketing)/
    layout.tsx           ← layout público (sem sidebar)
    page.tsx             ← /
    pricing/page.tsx     ← /pricing
  (app)/
    layout.tsx           ← layout autenticado (com sidebar)
    dashboard/page.tsx   ← /dashboard
    dashboard/exams/page.tsx
```

Cada grupo tem seu próprio layout sem prefixo de URL.

## Path alias

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Use `@/` para tudo que não é relativo curto. Relativo só para imports dentro da mesma pasta (`./new-exam-form`).
