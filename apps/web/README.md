# @lucida/web

Frontend do monorepo Lucida. Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui.

Siga o skill [`lucida-frontend`](../../.claude/skills/lucida-frontend/SKILL.md) para padrões de componente,
data fetching (Server Components + Server Actions + TanStack Query), forms (react-hook-form + Zod),
estado global (Zustand) e tokens da marca.

## Estrutura

```
src/
  app/                ← App Router (pages, layouts, server actions)
  features/<feature>/ ← componentes, actions, schemas por feature
  components/
    ui/               ← shadcn/ui primitives
    layout/           ← header, footer, shells
  lib/                ← cn, utilitários puros
  hooks/              ← hooks reutilizáveis
  stores/             ← zustand stores
  server/             ← server actions compartilhadas, data-access server-only
  styles/             ← globals.css com @theme (tokens da marca)
```

## Identidade visual

- Azul principal: `#007AFF` (`--color-brand-primary`)
- Fonte corpo: Poppins (`--font-sans`)
- Fonte destaque: Instrument Serif italic (`--font-serif`)

Tokens completos em [globals.css](src/styles/globals.css).

## Scripts

- `pnpm dev` — Next dev server
- `pnpm build` — build de produção
- `pnpm start` — serve build
- `pnpm lint` — next lint
- `pnpm typecheck` — tsc --noEmit
