---
name: lucida-frontend
description: Padrões para código frontend React neste workspace (Next.js 15+ App Router, React 19, TypeScript, Tailwind v4, shadcn/ui). Aplica a identidade visual Lucida/Exam (azul #007AFF, Poppins + Instrument Serif) e organiza por feature. Server Components por padrão, server actions para mutations, react-hook-form + Zod para forms, TanStack Query para data client-side, Zustand para estado global de UI. Carregue ao criar/editar página, componente, formulário, rota App Router, server action, store, hook ou tema em lucida-client, lucida-lp, ou qualquer frontend React/Next novo. Também serve como guia de revisão de código frontend existente.
---

# Lucida Frontend (Next.js + Tailwind v4 + shadcn/ui)

Stack fixo: **Next.js 15+ App Router**, **React 19**, **TypeScript**, **Tailwind v4**, **shadcn/ui**, fontes **Poppins + Instrument Serif**.

Produtos com paletas próprias (nunca misturar no mesmo layout):
- **Lucida / Lucida Exam** — professor individual. Azul principal `#007AFF`. Tokens `--color-brand-*`.
- **Lucida Analytics** — dashboard de organizações / instituições (gestão). Roxo principal `#6C3CFB`. Tokens `--color-analytics-*`.
- **Kintal** — backoffice interno da equipe Lucida (staff-only, rota `/kintal/*`). Sem cor de produto: paleta preto/branco/cinza usando os neutros já existentes (`--color-ink`, `--color-gray-*`). Ativado via wrapper `.theme-kintal`.

Ao entrar numa seção de um produto, toda a hierarquia visual (CTA, links, accents, hero) herda o tom daquele produto. Paletas detalhadas em [brand-tokens.md](references/brand-tokens.md).

Dados: **Server Components + Server Actions** por padrão. **TanStack Query** para dados client-side (cache, polling, paginado). **react-hook-form + Zod** para forms. **Zustand** para estado global de UI.

## Os 15 mandamentos

1. **Server Components por padrão**. `"use client"` só quando precisar de estado, eventos, refs, Context, ou browser API. Nunca "por via das dúvidas".
2. **Fetching em server component via `await`**. Client-side só com TanStack Query quando precisa de cache/revalidation/polling.
3. **Mutations via server actions**, não via `fetch('/api/...')` a partir do client quando dá para usar action.
4. **Forms via react-hook-form + zodResolver**. Schema Zod compartilhado entre client (validação no browser) e server action (validação no servidor, única fonte da verdade).
5. **Estado global de UI em Zustand**, não em Context. Context reservado para valores imutáveis de sessão (tema, locale, usuário atual).
6. **Tokens da marca em CSS variables** via Tailwind v4 `@theme`. Hex hardcoded em componente = violação.
7. **`cn()` para classes condicionais**, nunca concat de string.
8. **`asChild` + Radix Slot para composição**, em vez de prop `as` com `if` gigante. Para variants use `cva()` (já vem com shadcn).
9. **Tipografia via `next/font`**, auto-hospedada. Poppins variable + Instrument Serif italic para destaques.
10. **Componente só sabe de si**. Lógica de fetching vive no server component pai; filho recebe props prontas e é agnóstico de origem de dados.
11. **Props tipadas com `interface`**. Arquivos `kebab-case.tsx`, componentes `PascalCase`, props `camelCase`, hooks `useCamelCase`, stores `useCamelCaseStore`.
12. **Early return** para loading/erro/vazio. JSX principal fica limpo.
13. **Um componente = um arquivo**. Se passa de ~150 linhas ou mais de uma responsabilidade, decomponha.
14. **Imports ordenados**: React/Next → libs externas → `@/*` → relativos. Configure `eslint-plugin-import` ou similar.
15. **Acessibilidade não é opcional**: HTML semântico, labels associados, focus visível (shadcn já cuida), contraste WCAG AA. `#007AFF` em fundo branco **só passa para texto grande (≥18pt/14pt bold)** — para texto pequeno use `--color-brand-dark-01` (#1D14FF) ou `--color-brand-super-dark`.

## Estrutura

```
src/
  app/                       ← Next App Router (rotas, layouts, server components, page.tsx, actions)
  features/<feature>/        ← componentes, server actions, schemas, hooks por feature
  components/
    ui/                      ← shadcn primitives customizados (Button, Input, etc.)
    layout/                  ← header, footer, shells, grids
  lib/                       ← cn, utilitários puros, clients externos
  hooks/                     ← hooks reutilizáveis (useCamelCase)
  stores/                    ← zustand stores (useCamelCaseStore)
  server/                    ← server actions compartilhadas, acesso a dados server-only
  styles/                    ← globals.css com @theme (tokens da marca)
```

Detalhes em [folder-structure.md](references/folder-structure.md).

## Identidade visual

Dois produtos, duas paletas. Escolha a paleta pelo **contexto da tela**, não pelo
componente — isso dá no mesmo componente render correto em Exam (azul) e em Analytics
(roxo) via troca de tema no layout.

**Lucida / Lucida Exam — tokens `--color-brand-*`** (completo em [brand-tokens.md](references/brand-tokens.md)):
- `--color-brand-primary: #007AFF` — azul principal
- `--color-brand-dark-01: #1D14FF` — azul escuro saturado (texto/CTA em fundo claro)
- `--color-brand-dark-02: #150BBC` — azul ainda mais escuro
- `--color-brand-light: #7FBDF4` — azul claro (bg suave, accents)

**Lucida Analytics — tokens `--color-analytics-*`** (paleta roxa, usada em dashboards de organizações):
- `--color-analytics-primary: #6C3CFB` — roxo principal
- `--color-analytics-dark-01: #4D30CE` — roxo escuro 01 (texto/CTA em fundo claro)
- `--color-analytics-dark-02: #1E0A96` — roxo escuro 02
- `--color-analytics-light: #927AFC` — roxo claro (bg suave, accents)

**Kintal — grayscale** (backoffice interno, rota `/kintal/*`). Não tem token próprio — a paleta é construída só com neutros compartilhados:
- `--color-ink: #0A0A0A` — preto dos CTAs e texto
- `--color-gray-800 / 700 / 600` — variantes de hover e texto secundário
- `--color-background: #FFFFFF` e `--color-gray-50 / 100` — fundos e bordas
- Ativar via classe `.theme-kintal` no layout de `/kintal/*`. Logos P&B em `public/brand/kintal/` (`logo-lucida-bw.svg`, `logo-lucida-white.svg`, `symbol-lucida-bw.svg`).

**Neutros compartilhados** (os dois produtos usam iguais):
- `--color-brand-super-dark: #051E2C` — fundo dark da marca
- `--color-brand-off-white: #F9F5EA` — fundo claro alternativo ao branco puro

Padrão de troca de tema por layout: envolver a seção Analytics com `.theme-analytics`
pra remapear as vars `semânticas` (`--color-primary`, `--color-ring`, etc.) pros tokens
roxos — assim componentes shadcn herdam o tom sem precisar de `variant="analytics"`.
Ver [brand-tokens.md](references/brand-tokens.md).

**Tipografia**:
- `--font-sans: 'Poppins'` — institucional (corpo, títulos, UI)
- `--font-serif: 'Instrument Serif'` — destaque (normalmente italic)
- Hierarquia: [typography.md](references/typography.md)

**Logo**:
- Tamanho mínimo: **160px** (logo completo), **40px** (apenas símbolo).
- Área de proteção: igual à largura da letra "c" do logotipo.
- 5 posições válidas em layout: 4 cantos + centro.
- Nunca rotacionar, aplicar outline, ou recolorir fora das cores permitidas pelo manual.

## Navegação por arquivos de referência

- Layout de pastas, nomes, colocation → [folder-structure.md](references/folder-structure.md)
- Cores, spacing, radii, tokens da marca → [brand-tokens.md](references/brand-tokens.md)
- Fontes, hierarquia, `next/font` → [typography.md](references/typography.md)
- Setup e customização do shadcn/ui → [shadcn-setup.md](references/shadcn-setup.md)
- Padrões de componente (RSC, composition, clean code) → [component-patterns.md](references/component-patterns.md)
- Server components + server actions + TanStack Query → [data-fetching.md](references/data-fetching.md)
- Forms com react-hook-form + Zod → [forms.md](references/forms.md)
- Estado global com Zustand → [state-management.md](references/state-management.md)
- Acessibilidade + performance → [quality-a11y-perf.md](references/quality-a11y-perf.md)
- **Criar feature/página nova** → [scaffolding-checklist.md](references/scaffolding-checklist.md)

## Anti-patterns críticos (red flags em review)

- ❌ `useState` em server component (erro de build, mas vale revisar intent).
- ❌ `"use client"` no topo de componente que só renderiza JSX estático ou passa filhos.
- ❌ `className={isActive ? 'bg-blue-500' : ''}` — use `cn()` + tokens (`bg-brand-primary`).
- ❌ Fetch via `useEffect` quando podia ser server component.
- ❌ Hex de cor hardcoded fora de `globals.css`.
- ❌ `any` em props. Prefira `unknown` + narrowing, ou tipar direito.
- ❌ Componente `page.tsx` com 400 linhas. Quebre em seções.
- ❌ Prop `as`/`variant` virando `if` gigante — use `cva()`.
- ❌ Fonte web sem `next/font` (CLS + layout shift).
- ❌ Imagem sem `next/image` (perf + CLS).
- ❌ Form com `useState` por campo em vez de react-hook-form.
- ❌ `z-index` numérico mágico (`z-[9999]`). Use escala de tokens ou `z-50`/`z-40`.

## Ao criar código frontend novo

1. Ler [scaffolding-checklist.md](references/scaffolding-checklist.md).
2. Começar pelo server component pai (page/layout) e decidir onde fica a fronteira para client (`"use client"`).
3. Forms: schema Zod primeiro, depois server action, depois componente com react-hook-form.
4. Cada componente client deve ter responsabilidade única.
5. Tokens da marca em vez de cores arbitrárias.
