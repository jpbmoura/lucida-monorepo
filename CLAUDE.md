# CLAUDE.md — lucida-monorepo

Monorepo unificado da Lucida. Vai substituir os quatro projetos independentes
(`lucida-api-v2`, `lucida-api`, `lucida-client`, `lucida-lp`) que vivem no workspace
pai. Ainda está em fase de scaffold — nenhum feature migrado.

## Layout

```
lucida-monorepo/
├── apps/
│   ├── api/          ← backend unificado (Express 5 + TS + Mongoose + Zod)
│   └── web/          ← frontend unificado (Next.js 15 + React 19 + Tailwind v4)
├── packages/         ← (reservado) código compartilhado entre apps
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json      ← workspace root
```

Gerenciador: **pnpm**. Node >= 20.11.

## Apps

### `apps/api` — `@lucida/api`

Backend Express 5 seguindo **Clean Architecture + DDD por feature**.
Padrões definidos no skill [`backend-clean-ddd`](.claude/skills/backend-clean-ddd/SKILL.md).

Direção de dependência:
`presentation → application → domain ← infrastructure`

Cada feature em `src/domains/<feature>/` com as 4 camadas (domain/application/infrastructure/presentation).
Composition root em `src/main.ts` — DI manual, sem container, sem decorators.

Stack inicial: `express`, `mongoose`, `zod`, `cors`, `dotenv`. Dev: `tsx`, `tsc-alias`, `vitest`.
Path alias `@/*` → `src/*`.

### `apps/web` — `@lucida/web`

Next.js 15 App Router + React 19 + TypeScript + Tailwind v4 + shadcn/ui.
Padrões no skill [`lucida-frontend`](.claude/skills/lucida-frontend/SKILL.md).
Identidade visual (cores, tipografia, logo) no skill [`brand-lucida`](.claude/skills/brand-lucida/SKILL.md).

Defaults:
- **Server Components** por padrão; `"use client"` só quando necessário.
- **Server Actions** para mutations, **TanStack Query** para dados client-side.
- **react-hook-form + Zod** para forms.
- **Zustand** para estado global de UI.

Tokens da marca (azul `#007AFF`, Poppins + Instrument Serif) em
[`apps/web/src/styles/globals.css`](apps/web/src/styles/globals.css) via `@theme` do Tailwind v4.

## Comandos

Rode a partir da raiz do monorepo:

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala tudo nos workspaces |
| `pnpm dev:api` | Dev server do backend (tsx watch, porta 3333) |
| `pnpm dev:web` | Dev server do frontend (Next dev, porta 3000) |
| `pnpm build` | Build recursivo (api + web) |
| `pnpm lint` | Lint recursivo |
| `pnpm typecheck` | `tsc --noEmit` em todos os workspaces |

Para rodar comandos em um workspace específico:
```
pnpm --filter @lucida/api <script>
pnpm --filter @lucida/web <script>
```

## Como os apps conversam

- Frontend chama o backend via `NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3333`).
- Ainda não há auth, webhooks, Stripe, OpenAI ou Clerk — serão migrados dos projetos
  legados conforme as features forem reescritas. Veja [`../CLAUDE.md`](../CLAUDE.md)
  para o mapeamento das APIs/integrações existentes que precisam ser portadas.

## Código compartilhado (`packages/`)

Pasta reservada. Quando surgir algo compartilhado entre api e web (DTOs, schemas Zod
de contratos, tipos de domínio expostos ao frontend), crie um workspace em
`packages/<nome>/` com `name: @lucida/<nome>` e consuma via `workspace:*` nas deps.

## Migração dos projetos legados

O objetivo é consolidar aqui:

- `lucida-api-v2` → `apps/api` (auth, users, billing, Stripe, partners…)
- `lucida-api`   → `apps/api` (AI exam generation, webhooks)
- `lucida-client` → `apps/web` (SaaS autenticado: dashboard, exam, OMR, grading)
- `lucida-lp`    → `apps/web` (landing pública + contato)

Regras durante a migração:
1. Cada feature migrada entra como bounded context em `apps/api/src/domains/<feature>/`.
2. Páginas públicas (lp) e autenticadas (client) coexistem no mesmo `apps/web` — use
   route groups do App Router (`(marketing)`, `(app)`) para separar layouts.
3. Não copie código legado cru; reescreva respeitando os skills. Código antigo nos
   projetos irmãos é **referência**, não template.
4. Nunca instale dependência sem rodar `pnpm install` a partir da raiz.

## Convenções

- Arquivos `kebab-case`, classes `PascalCase`, variáveis/funções `camelCase`. Sem prefixo `I` em interfaces.
- Copy em português (pt-BR) no frontend.
- Commits: mensagens em inglês, imperativo curto.

## Skills disponíveis

Vivem em [`.claude/skills/`](.claude/skills/) — auto-carregadas pelo Claude Code quando o contexto bate na descrição:

| Skill | Quando usa |
|---|---|
| [`backend-clean-ddd`](.claude/skills/backend-clean-ddd/SKILL.md) | Criar/editar feature, endpoint, entidade, repositório, use case ou rota em `apps/api`. |
| [`lucida-frontend`](.claude/skills/lucida-frontend/SKILL.md) | Criar/editar componente, página, form ou estado em `apps/web` (Next.js 15 + React 19 + Tailwind v4 + shadcn/ui). |
| [`brand-lucida`](.claude/skills/brand-lucida/SKILL.md) | Qualquer trabalho visual — cores, tipografia, logo, layout, materiais de marketing. Cobre as paletas Exam (azul) e Analytics (roxo). |
