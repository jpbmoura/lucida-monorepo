# Lucida — Briefing Técnico

> Visão técnica da aplicação: stack, arquitetura, integrações e convenções.
> Última revisão: maio/2026.

---

## 1. Visão geral

Monorepo **pnpm** (`lucida-monorepo`) com dois apps que se comunicam via HTTP:

```
apps/web   →  Next.js 15 (frontend: marketing + SaaS + analytics + kintal)
apps/api   →  Express 5 (backend: Clean Architecture + DDD por feature)
packages/  →  reservado (vazio) — código compartilhado futuro
```

- **Node** ≥ 20.11 · **pnpm** 9.12 · **TypeScript** 5.6 · ESM puro nos dois apps.
- `tsconfig.base.json`: target ES2022, `strict`, `noUncheckedIndexedAccess`, moduleResolution Bundler.
- Path alias `@/*` → `src/*` nos dois apps.

---

## 2. Backend — `apps/api`

**Stack:** Express 5, Mongoose 8 (MongoDB), Better Auth, Zod, Stripe, OpenAI, Resend,
multer, pdf-parse, mammoth, docx, youtube-transcript. Dev: `tsx` (watch), build com
`tsc` + `tsc-alias`. Testes: Vitest (configurado, sem testes ainda).

### Arquitetura — Clean Architecture + DDD por feature

Cada domínio em `src/domains/<feature>/` com 4 camadas. Direção de dependência:

```
presentation → application → domain ← infrastructure
```

- **domain** — entidades, value objects, erros, interfaces de repositório, serviços de domínio. Puro, sem libs.
- **application** — use cases (1 arquivo por caso de uso). Orquestra domínio + repositórios.
- **infrastructure** — implementações Mongoose dos repositórios, schemas, clients externos (Stripe, OpenAI, etc).
- **presentation** — rotas Express, controllers, DTOs Zod, middlewares.

Cada feature expõe um `*.module.ts` (factory que faz a DI manual e devolve router + use cases).
**Composition root** em `src/main.ts` — DI manual, sem container, sem decorators.
`bootstrap()` conecta o Mongo, monta os módulos e cria o app; `server.ts` faz o `listen`.

Exemplo da estrutura (domínio `billing`):
```
domain/        wallet.entity, ledger-entry.entity, subscription.entity,
               credit-amount.vo, plan.vo, *.repository (interfaces), atomic-debit.service
application/   grant-welcome-credits, debit-credits, create-checkout-session,
               handle-stripe-webhook, create-pix-topup, expire-credits, ...
infrastructure/ mongoose-*.repository, stripe.client, abacatepay.client, *.schema
presentation/  billing.routes, billing.controller, billing-webhook.controller, dtos/
```

### Ordem de middleware (em `app.ts` — não reordenar)

1. `cors` (origin = `WEB_ORIGIN`, `credentials: true`)
2. **Better Auth** em `/api/auth/*splat` (lê body cru, antes do JSON parser)
3. **rawBodyRouters** (webhook Stripe — precisa de raw body)
4. `express.json({ limit: "15mb" })` (15MB acomoda fotos OMR em base64)
5. `/health`
6. demais routers
7. `errorHandler` (converte `DomainError` → HTTP)

### Convenções backend

- Erros via `throw` de `DomainError`; tratados num error handler central.
- Zod **só** na camada de presentation (validação de input).
- Imports com extensão `.js` (ESM puro).
- Arquivos `kebab-case`, classes `PascalCase`. Sem prefixo `I` em interfaces.

### Domínios (`src/domains/`)

`iam`, `class`, `student`, `exam`, `submission`, `course`, `lesson-plan`, `ai-ops`,
`scan`, `billing`, `invoicing`, `finance`, `analytics`, `api-access`, `public-api`,
`webhook-dispatch`, `kintal`, `kanban`, `notifications`, `organization-preferences`,
`roadmap`, `support`, `tickets`.

### Infra/shared transversal

- `infrastructure/database/mongodb/connection.ts` — conexão Mongoose única.
- `infrastructure/middlewares/error-handler.ts` — `DomainError` → HTTP.
- `shared/errors/domain-error.ts` — base de erros de domínio.
- `shared/http/sse.ts` — helper de **Server-Sent Events** (streaming de geração de IA pro client).
- `shared/security/exam-link-token.ts` — tokens assinados dos links públicos de prova.

### `ai-ops` — o coração de IA (destaque)

Geração via OpenAI (model default `gpt-4.1-mini`, configurável). Pipeline:
1. **Extractors** (`infrastructure/extractors/`): PDF (`pdf-parse`), DOCX (`mammoth`),
   texto puro e **transcrição de YouTube** → normaliza tudo pra texto-fonte (`collect-sources`).
2. **Estimativa de custo** antes de gerar (`estimate-credits`, `exam-pricing`,
   `lesson-plan-pricing`) → cobra créditos proporcionais.
3. **Geração** com prompts modulares (`infrastructure/openai/prompts/`):
   - **estilos**: `simple`, `contextual` (ENEM), `analytical` (ENADE), `reflective`.
   - **módulos compartilhados**: `golden-rules`, `injection-defense` (defesa contra prompt
     injection no material do professor), `output-contract`, `distractor-discipline`
     (qualidade das alternativas erradas), `bloom-calibration`, `math-notation`, `persona`.
   - **planos de aula**: prompts por segmento (`fundamental`, `medio`, `faculdade`, `infoprodutor`).
4. **Pós-processamento**: `normalize-math`, `answer-explanation-verifier` (verifica a
   explicação da resposta correta).
5. Regeneração granular: `regenerate-question`, `regenerate-lesson-block`.

---

## 3. Frontend — `apps/web`

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui
(Radix), TanStack Query, react-hook-form + Zod, Zustand (estado UI), Recharts
(gráficos), dnd-kit (drag-and-drop), motion/Framer (animação), Shiki (syntax nos docs),
KaTeX (fórmulas), pdfjs-dist + mammoth (render/extração de PDF/DOCX no client).

### Padrões

- **Server Components** por padrão; `"use client"` só quando necessário.
- **Server Actions** para mutations; **TanStack Query** para dados client-side.
- **react-hook-form + Zod** nos forms.
- Tailwind v4 via `@theme` em `styles/globals.css` (tokens da marca: azul `#007AFF`, Poppins + Instrument Serif).
- Código de UI organizado por contexto em `src/features/`:
  `marketing`, `auth`, `app`, `analytics`, `kintal`, `notifications`, `public-exam`,
  `accept-invite`, `docs`, `roadmap`.

### Organização de `src/`

- `app/` — rotas (App Router). · `features/` — UI por contexto.
- `components/ui/` — primitivos shadcn/ui (Radix): button, dialog, input, sheet, etc.
- `lib/` — helpers cross-feature: `api-client`, `auth-client`, `get-server-session`,
  `active-organization`, `get-effective-user` (resolve impersonation/assistente),
  `tax-id`, `viacep` (CEP), `math-text`, `relative-time`.
- `server/` — código server-only · `stores/` — Zustand · `hooks/` — hooks React.
- Cada feature segue o padrão `components/` + `steps/` (wizards) + **`actions.ts`**
  (Server Actions de mutation). Geração de prova/aula usa **streaming SSE** vindo da api.

### Detalhes de config

- `next.config.ts`: rewrites `/api/auth/*` e `/v1/*` → api; redirect `www` → apex;
  Server Actions com `bodySizeLimit: 25mb` (anexar PDF/DOCX ao criar prova);
  `eslint.ignoreDuringBuilds: true`.
- Auth client (`better-auth/react`) com plugins `organizationClient` + `magicLinkClient`,
  mesma origem (cookie sem CORS, graças ao rewrite).

### Topologia de rotas (route groups / folders top-level p/ separar layouts)

- `(marketing)` — landing pública (`/`, `/precos`, `/contact`, `/privacidade`, `/termos`)
- `(auth)` — `/sign-in`, `/sign-up`, `/organizacoes/*`, reset de senha
- `app/` — SaaS do professor (`/app`, `/provas`, `/turmas`, `/cursos`, `/aulas`, `/billing`, `/analises`, `/notificacoes`, `/configuracoes`, `/ajuda`)
- `analytics/` — painel institucional (admin de org)
- `kintal/` — backoffice interno (staff)
- `auxiliar/` — seletor de conta para assistentes
- `exam/[shareId]` — página pública do aluno · `print/exams` e `print/lesson-plans` — versões imprimíveis
- `docs/` — documentação da Public API · `roadmap/`, `accept-invite/`

### Middleware (edge)

Protege `/app`, `/analytics`, `/kintal` checando **só presença do cookie de sessão**
(`lucida.session_token` / `__Secure-...`) — sem cookie → redirect p/ `/sign-in?next=...`.
O **gating por role** (staff, org admin) fica nos layouts/use cases do servidor, não no edge.

---

## 4. Como os apps conversam

```
Browser → Next (3000)
          ├─ rewrite /api/auth/* → api:3333  (Better Auth)
          └─ rewrite /v1/*       → api:3333  (rotas autenticadas + públicas)
              ↓
        @lucida/api (3333)
          ├─ MongoDB (Mongoose; replica set p/ transações de billing)
          ├─ Stripe (checkout, portal, webhook /v1/billing/webhook — raw body)
          ├─ OpenAI (geração em ai-ops)
          ├─ Resend (e-mails transacionais + inbound de tickets)
          ├─ NFE.io (NFS-e), AbacatePay (PIX)
          └─ OMR svc (Python externo; sem URL → 502)
```

O browser **nunca** fala direto com `:3333` — tudo passa pelo rewrite do Next.
Frontend usa `NEXT_PUBLIC_API_URL` (default `http://localhost:3333`).

---

## 5. Auth & multi-tenant

- **Better Auth** (v1.6): cookie `lucida.session_token` (`__Secure-` em prod).
  Providers: **Google OAuth** + email/senha + **organization plugin**.
- Adapter Mongo próprio (`mongo-adapter.ts`). Redirect OAuth: `{AUTH_BASE_URL}/api/auth/callback/google`.
- Hook `onUserCreated` → `GrantWelcomeCreditsUseCase` (por isso billing é montado **antes** da auth no composition root).
- Middlewares de presentation: `require-auth`, `require-staff`, `with-org-context`.
- Multi-tenant: conta individual (professor) e organização (escola/rede) com créditos compartilhados.

---

## 6. Integrações externas (todas opcionais, exceto core)

| Integração | Uso | Sem env |
|---|---|---|
| **MongoDB** | persistência (Mongoose) | api não sobe |
| **OpenAI** | geração/regeneração de questões (`ai-ops`); model default `gpt-4.1-mini` | obrigatório |
| **Resend** | e-mails (verify, reset, invites, recibos, ajuda) + **inbound de tickets** | obrigatório |
| **Stripe** | assinaturas + top-ups + webhook (raw body) | checkout/portal → 503 |
| **AbacatePay** | PIX para top-ups (Stripe não libera PIX na conta) | rota PIX → 503 |
| **NFE.io** | emissão de NFS-e por transação financeira; default sandbox | invoicing offline |
| **OMR svc** (Python) | leitura de folha de respostas em papel | `/v1/scan` → 502 |
| **CRON** | `POST /v1/internal/expire-credits` (header `CRON_SECRET`) | 503 |

Padrão geral: **degradação graciosa** — falta de env desliga só a feature, o resto da api segue.

---

## 7. Billing — ponto de atenção

- Créditos com **ledger** (entradas/saídas) e **débito atômico** (`AtomicDebitService`)
  usando `session.withTransaction` → **exige MongoDB com replica set** (`--replSet rs0` +
  `rs.initiate()` em dev, ou Atlas). Sem replica set, qualquer débito quebra.
- Welcome credits configuráveis (`WELCOME_CREDITS`, default 2000).
- Stripe price IDs por plano (basic/pro × monthly/yearly) e top-ups (2k/5k/15k) em env.
- Webhook Stripe usa **raw body** — montado antes do `express.json()`. Não reordenar.

---

## 8. Comandos (da raiz)

| Comando | O que faz |
|---|---|
| `pnpm install` | instala todos os workspaces |
| `pnpm dev` | sobe api + web em paralelo |
| `pnpm dev:api` / `pnpm dev:web` | só backend (3333) / só frontend (3000) |
| `pnpm build` | build recursivo (api: tsc + tsc-alias; web: next build) |
| `pnpm lint` / `pnpm typecheck` | `tsc --noEmit` nos workspaces (web: next lint) |
| `pnpm --filter @lucida/api test` | Vitest (sem testes escritos ainda) |

Scripts de migração/seed/backfill em `apps/api/scripts/` (via `pnpm --filter @lucida/api migrate:* / seed:* / backfill:*`).

---

## 9. Pontos de atenção / dívidas

- **Sem testes** escritos (Vitest pronto na api; web sem runner).
- `packages/` ainda vazio — DTOs/schemas duplicados entre api e web por enquanto.
- Gating de role só no servidor (edge checa apenas presença de cookie) — correto, mas exige disciplina nos layouts.
- NFE.io aponta pra **sandbox** por default — trocar URL em produção.
- Quatro projetos legados (`lucida-api-v2`, `lucida-api`, `lucida-client`, `lucida-lp`) são só referência histórica.
