# CLAUDE.md — lucida-monorepo

Monorepo unificado da Lucida — codebase canônico. Substitui os quatro projetos legados
(`lucida-api-v2`, `lucida-api`, `lucida-client`, `lucida-lp`) que ainda existem no
workspace pai apenas como referência histórica. Veja [`../CLAUDE.md`](../CLAUDE.md) para
o que sobrou neles.

## Layout

```
lucida-monorepo/
├── apps/
│   ├── api/          ← backend Express 5 (Clean Architecture + DDD por feature)
│   └── web/          ← frontend Next.js 15 (marketing + SaaS + analytics + kintal)
├── packages/         ← (reservado) código compartilhado entre apps
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json      ← workspace root
```

Gerenciador: **pnpm** (≥ 9.12). Node ≥ 20.11. Não existe pasta `packages/` ainda — é
um placeholder reservado pra quando precisarmos compartilhar DTOs/schemas entre api e web.

## Apps

### `apps/api` — `@lucida/api`

Backend Express 5 + TypeScript ESM seguindo **Clean Architecture + DDD por feature**.
Padrões definidos no skill [`backend-clean-ddd`](.claude/skills/backend-clean-ddd/SKILL.md).

Direção de dependência:
`presentation → application → domain ← infrastructure`

Cada feature em [`apps/api/src/domains/<feature>/`](apps/api/src/domains/) com as 4 camadas
(domain/application/infrastructure/presentation). Composition root em
[`apps/api/src/main.ts`](apps/api/src/main.ts) — DI manual, sem container, sem decorators.
App Express criado em [`apps/api/src/app.ts`](apps/api/src/app.ts), entrypoint em
[`apps/api/src/server.ts`](apps/api/src/server.ts), env validado via Zod em
[`apps/api/src/env.ts`](apps/api/src/env.ts).

Domínios já migrados:

| Domínio | Função |
|---|---|
| `iam` | Auth via **BetterAuth** (Google OAuth + email/senha + organization plugin). |
| `class` / `student` / `exam` / `submission` | Núcleo pedagógico — turmas, alunos, provas, respostas. |
| `course` | Catálogo de cursos do professor — agrupam turmas/provas; CRUD por dono ou organização. |
| `lesson-plan` | Planos de aula — criação/edição, snapshots de turma/curso/disciplina, skills BNCC, exportação DOCX, duplicação/arquivo, integração com geração de provas. |
| `ai-ops` | Geração e regeneração de questões via OpenAI; extractors PDF/DOCX/text/YouTube. |
| `scan` | OMR (folha de respostas) — proxy para serviço Python externo. |
| `billing` | Créditos, ledger, débito atômico, assinaturas Stripe + top-ups + webhook. |
| `invoicing` | Emissão de NFS-e via NFE.io — disparada por transações de billing; webhook de provider (`NFEIO_*`). |
| `finance` | Dashboard financeiro staff-only — despesas operacionais, categorização, histórico por competência. |
| `analytics` | Visões de organização — overview, professor, turma, aluno, exam, members. |
| `api-access` | API keys HMAC + endpoints de webhook configuráveis (público REST). |
| `public-api` | REST externo (parceiros) — turmas, alunos, exam links, results. |
| `webhook-dispatch` | Envia `submission.completed` para os endpoints registrados. |
| `kintal` | Backoffice interno (staff-only) — dashboard, staff, usuários, créditos. |
| `kanban` | Board interno usado pelo Kintal. |
| `notifications` | Inbox + campanhas (sender split entre staff e org-admin). |
| `organization-preferences` | Preferências por organização. |
| `roadmap` | Suggest + voting público; CRUD pra staff. |
| `support` | Form de contato (`/app/ajuda`) → email via Resend. |
| `tickets` | Suporte por email — inbound via Resend Inbound (`TICKETS_INBOUND_SECRET`), threading, fila staff no Kintal (distinto do form simples de `support`). |

Stack: `express` 5, `mongoose` 8, `better-auth`, `zod`, `stripe`, `openai`, `resend`,
`multer`, `pdf-parse`, `mammoth`, `docx`, `youtube-transcript`, `cors`. Dev: `tsx`, `tsc-alias`, `vitest`.
Path alias `@/*` → `src/*` (resolvido em build pelo `tsc-alias`).

### `apps/web` — `@lucida/web`

Next.js 15 App Router + React 19 + TypeScript + Tailwind v4 + shadcn/ui.
Padrões no skill [`lucida-frontend`](.claude/skills/lucida-frontend/SKILL.md).
Identidade visual (cores, tipografia, logo) no skill [`brand-lucida`](.claude/skills/brand-lucida/SKILL.md).

Defaults:
- **Server Components** por padrão; `"use client"` só quando necessário.
- **Server Actions** para mutations, **TanStack Query** para dados client-side.
- **react-hook-form + Zod** para forms.
- **Zustand** para estado global de UI; **Recharts** para gráficos; **dnd-kit** para drag-and-drop;
  **motion** (Framer) para animação; **Shiki** para syntax highlighting nos docs; **KaTeX** para
  fórmulas matemáticas; **pdfjs-dist** para render/extração de PDF no client.

Tokens da marca (azul `#007AFF`, Poppins + Instrument Serif) em
[`apps/web/src/styles/globals.css`](apps/web/src/styles/globals.css) via `@theme` do Tailwind v4.

Topologia de rotas — usa route groups e folders top-level pra separar layouts:

| Rota / grupo | Conteúdo |
|---|---|
| `(marketing)` | Landing pública (`/`, `/precos`, `/contact`, `/privacidade`, `/termos`). |
| `(auth)` | `/sign-in`, `/sign-up`, `/organizacoes/*` (login institucional). |
| `app/` | SaaS autenticado do professor — `/app`, `/app/provas/[id]`, `/app/turmas`, `/app/cursos`, `/app/aulas`, `/app/billing`, `/app/notificacoes`, `/app/configuracoes`, `/app/ajuda`, `/app/analises`. |
| `analytics/` | Dashboard de organização (admin de instituição) — `professores`, `desenvolvedores`, `notificacoes`, `configuracoes`, `ajuda`. |
| `kintal/` | Backoffice interno (staff-only) — `(app)` + `entrar`. |
| `auxiliar/` | Seletor de conta pra atendentes/assistentes (`auxiliar/escolher`) — atuar em nome de um professor supervisionado. |
| `roadmap/` | Roadmap público com voting. |
| `exam/[shareId]` | Página pública pra aluno responder a prova. |
| `print/exams/[id]` | Versão imprimível da prova. |
| `docs/` | Documentação da Public API — `quickstart`, `autenticacao`, `api`, `webhooks`, `erros`. |
| `accept-invite/` | Aceite de convite pra organização. |

Features (lógica de UI por contexto) em [`apps/web/src/features/`](apps/web/src/features/):
`marketing`, `auth`, `app`, `analytics`, `kintal`, `roadmap`, `public-exam`, `accept-invite`, `docs`, `notifications`.

Path alias `@/*` → `src/*` (configurado em [`apps/web/tsconfig.json`](apps/web/tsconfig.json)).

## Antes de rodar local

- Node ≥ 20.11, pnpm ≥ 9.12.
- **MongoDB com replica set** (`--replSet rs0` + `rs.initiate()`) ou Atlas. Sem isso,
  qualquer débito de crédito quebra — o `AtomicDebitService` usa `session.withTransaction`,
  que exige replica set.
- Copiar `apps/api/.env.example` → `apps/api/.env` e `apps/web/.env.example` →
  `apps/web/.env.local`. Schema completo das envs validado por Zod em
  [`apps/api/src/env.ts`](apps/api/src/env.ts) (web só usa `NEXT_PUBLIC_API_URL`).
- Mínimo pra subir api: `MONGODB_URI`, `AUTH_SECRET` (≥ 32 chars), `AUTH_BASE_URL`,
  `WEB_ORIGIN`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY`.
- Opcionais — sem eles, a feature correspondente devolve 503/502 mas o resto continua:
  `OMR_SERVICE_URL` (scan), `STRIPE_*` (checkout/portal), `ABACATEPAY_*` (PIX top-up),
  `CRON_SECRET` (expiração de wallets), `TICKETS_INBOUND_SECRET` (Resend Inbound),
  `NFEIO_*` (emissão de NFS-e).

## Comandos

Rode a partir da raiz do monorepo:

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala tudo nos workspaces |
| `pnpm dev` | Sobe api + web em paralelo (`-r --parallel --stream`) |
| `pnpm dev:api` | Só backend (tsx watch, porta 3333) |
| `pnpm dev:web` | Só frontend (Next dev, porta 3000) |
| `pnpm build` | Build recursivo (api: tsc + tsc-alias; web: next build) |
| `pnpm start` | Start recursivo (api: `node dist/server.js`; web: `next start`) |
| `pnpm lint` | Lint recursivo (api: `tsc --noEmit`; web: `next lint`) |
| `pnpm typecheck` | `tsc --noEmit` em todos os workspaces |

Vitest está instalado e configurado na api (`pnpm --filter @lucida/api test` ou
`test:watch`), mas o repo ainda não tem testes escritos. Web não tem test runner.

Para rodar comandos em um workspace específico:
```
pnpm --filter @lucida/api <script>
pnpm --filter @lucida/web <script>
```

### Scripts de migração / seed / backfill (api)

Vivem em [`apps/api/scripts/`](apps/api/scripts/) e rodam via `pnpm --filter @lucida/api ...`:

| Script | Função |
|---|---|
| `migrate:legacy` | Importa dados do MongoDB dos projetos legados. |
| `migrate:legacy-rename` | Renomeia coleções legadas in-place. |
| `migrate:billing-scope` | Migra escopo billing user → organization. |
| `migrate:normalize-user-ids` | Normaliza referências legacy de userId pra ObjectId BetterAuth. |
| `diagnose:legacy-ids` | Audita coleções procurando user IDs no formato antigo. |
| `seed:test-org` | Cria organização de teste com dados sintéticos. |
| `seed:roadmap` | Popula itens iniciais do roadmap. |
| `backfill:student-org` / `backfill:class-org` | Preenche `organizationId` retroativo. |
| `backfill:courses` | Preenche dados de curso retroativos em turmas/provas. |
| `billing:add-org-credits` | Concede créditos manuais para uma org. |
| `eval:generation` | Roda avaliação (eval) da geração de questões do `ai-ops`. |

Há também utilitários soltos em `.mjs` na mesma pasta (`promote-staff.mjs`,
`reset-password.mjs`, `inspect-accounts.mjs`, `export-user-exam-links.mjs`) — rodar
diretamente com `node`.

## Como os apps conversam

```
Browser ─▶ Next (3000)
           │
           │  rewrites:
           │   /api/auth/*  ─▶ api:3333/api/auth/*   (BetterAuth)
           │   /v1/*        ─▶ api:3333/v1/*         (rotas autenticadas + públicas)
           ▼
        @lucida/api (3333)
           │
           ├─▶ MongoDB  (Mongoose; precisa replica set p/ transações de billing)
           ├─▶ Stripe   (checkout, portal, webhook em /v1/billing/webhook)
           ├─▶ OpenAI   (geração de questões em ai-ops)
           ├─▶ Resend   (verify email, reset, invites, recibos, formulário ajuda)
           └─▶ OMR svc  (Python lucida-omr externo; sem URL → 502)
```

- **Auth = BetterAuth.** Cookie `lucida.session_token` (`__Secure-` em produção). Sessão é
  proxied pelo Next via [`apps/web/next.config.ts`](apps/web/next.config.ts) — o browser
  nunca fala direto com `:3333`. O middleware do web
  ([`apps/web/src/middleware.ts`](apps/web/src/middleware.ts)) protege `/app`, `/analytics`
  e `/kintal` checando só presença de cookie no edge; o gating por role (`staff`, org admin)
  fica no layout / nos use cases do servidor.
- **OAuth.** Google é o único provider externo configurado; redirect URI:
  `{AUTH_BASE_URL}/api/auth/callback/google`.
- **Welcome credits.** O hook `onUserCreated` da auth chama `GrantWelcomeCreditsUseCase`
  com `WELCOME_CREDITS` — billing precisa estar inicializado **antes** da auth no composition
  root (já é, mas evite inverter).
- **Stripe webhook usa raw body.** Montado em `rawBodyRouters` **antes** do `express.json()`
  global em [`apps/api/src/app.ts`](apps/api/src/app.ts). Não reordene.
- **Mongo precisa de replica set.** O débito atômico de créditos
  (`AtomicDebitService`) usa `session.withTransaction`. Em dev, suba Mongo com
  `--replSet rs0` + `rs.initiate()` ou aponte pro Atlas. Sem isso, qualquer débito quebra.
- **OMR opcional em dev.** Sem `OMR_SERVICE_URL`, as rotas de `/v1/scan` devolvem 502
  via `UnavailableOmrClient` — o resto da api segue funcionando.
- **Public API + webhooks.** API keys HMAC (`api-access`) gateiam `/v1/public/*`
  (`public-api`); submissões finalizadas disparam `submission.completed` para os endpoints
  cadastrados via `webhook-dispatch`.
- **CRON interno.** `POST /v1/internal/expire-credits` (header `CRON_SECRET`) expira wallets
  vencidas. Sem env → 503.

Frontend chama o backend via `NEXT_PUBLIC_API_URL` (default `http://localhost:3333`).

## Código compartilhado (`packages/`)

Pasta reservada — ainda não existe no disco. Quando surgir algo compartilhado entre api e web
(DTOs, schemas Zod de contratos, tipos de domínio expostos ao frontend), crie um workspace em
`packages/<nome>/` com `name: @lucida/<nome>` e consuma via `workspace:*` nas deps.

## Migração dos projetos legados — status

Mapeamento original → atual:

- `lucida-api-v2` → `apps/api`: auth (Clerk → **BetterAuth**), users, billing, Stripe,
  scan/OMR, public API, partners. ✅
- `lucida-api`   → `apps/api`: AI exam generation (`ai-ops`), webhook dispatch. ✅
- `lucida-client` → `apps/web` (`app/`, `analytics/`, `kintal/`): dashboard, exam, OMR,
  grading, organização. ✅
- `lucida-lp`    → `apps/web` (`(marketing)/`): landing, preços, contato. ✅

Regras durante migração de qualquer feature restante:
1. Cada feature entra como bounded context em `apps/api/src/domains/<feature>/`.
2. Páginas públicas e autenticadas coexistem no mesmo `apps/web` — use route groups do
   App Router (`(marketing)`, `(auth)`) ou folders top-level (`app/`, `analytics/`,
   `kintal/`) pra separar layouts.
3. Não copie código legado cru; reescreva respeitando os skills. Código antigo nos
   projetos irmãos é **referência**, não template. Importante: a auth virou BetterAuth —
   qualquer código legado que assumia Clerk (`userId` string vinda de `auth()`) precisa
   ser repensado.
4. Nunca instale dependência sem rodar `pnpm install` a partir da raiz.

## Convenções

- Arquivos `kebab-case`, classes `PascalCase`, variáveis/funções `camelCase`. Sem prefixo `I` em interfaces.
- Copy de UI em **português (pt-BR)**.
- Commits: mensagens em inglês, imperativo curto.
- Imports com extensão `.js` no api (ESM puro).

## Skills disponíveis

Vivem em [`.claude/skills/`](.claude/skills/) — auto-carregadas pelo Claude Code quando o contexto bate na descrição:

| Skill | Quando usa |
|---|---|
| [`backend-clean-ddd`](.claude/skills/backend-clean-ddd/SKILL.md) | Criar/editar feature, endpoint, entidade, repositório, use case ou rota em `apps/api`. |
| [`lucida-frontend`](.claude/skills/lucida-frontend/SKILL.md) | Criar/editar componente, página, form ou estado em `apps/web` (Next.js 15 + React 19 + Tailwind v4 + shadcn/ui). |
| [`brand-lucida`](.claude/skills/brand-lucida/SKILL.md) | Qualquer trabalho visual — cores, tipografia, logo, layout, materiais de marketing. Cobre as paletas Exam (azul) e Analytics (roxo). |
