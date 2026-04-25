# Scaffolding de feature/página nova

Quando o usuário pede "crie a tela X" ou "adicione a feature Y", siga este checklist em ordem.

## Perguntas a fazer ANTES de começar

Se o usuário não deu contexto, **pergunte**:

1. **É rota nova ou componente dentro de rota existente?**
2. **Precisa de autenticação?** (se sim, vai dentro de `app/(app)/` ou layout autenticado)
3. **Dados**: vem de onde? (lucida-api-v2 via `LUCIDA_CLIENT_TOKEN`? lucida-api? Mongo direto? nenhum?)
4. **Interação**: estático (só display), form, lista com filtros, dashboard com tempo real?
5. **Mutations?** Quais operações disparam action?
6. **Reutilização**: componentes serão usados em outras telas? (isso decide `app/` vs `features/`)
7. **Responsividade**: só desktop, mobile-first, ambos?
8. **Branding específico?** Hero com bg dark (manual prefere `brand-super-dark`) ou light?

Sem respostas para 1, 3 e 4, vai scaffolding no escuro.

## Passo 1 — Roteamento (App Router)

Decida a estrutura de rotas:

```
app/
  (app)/                         ← grupo autenticado (se aplicável)
    layout.tsx                   ← requireUser, sidebar, etc
    dashboard/
      exams/
        page.tsx                 ← /dashboard/exams (lista)
        new/
          page.tsx               ← /dashboard/exams/new (criar)
          new-exam-form.tsx
          actions.ts
          schemas.ts
        [id]/
          page.tsx               ← /dashboard/exams/:id (detalhe)
          edit/page.tsx          ← /dashboard/exams/:id/edit
          loading.tsx
          error.tsx              ← client component
```

- [ ] `page.tsx` em cada rota (server component por padrão).
- [ ] `layout.tsx` se a rota filha precisa de shell próprio.
- [ ] `loading.tsx` para UX durante fetching.
- [ ] `error.tsx` (client component) para erro boundary.
- [ ] `not-found.tsx` se a rota tem params que podem não existir.

## Passo 2 — Zod schemas

Para qualquer form ou API call, **schema primeiro**:

- [ ] `schemas.ts` colocalizado com a action (ou em `features/<feature>/schemas.ts` se compartilhado).
- [ ] Mensagens em pt-BR.
- [ ] Tipo inferido exportado: `export type CreateExamInput = z.infer<typeof createExamSchema>`.
- [ ] Sem duplicação entre client e server — um schema só.

Referência: [forms.md](forms.md).

## Passo 3 — Server action (se há mutation)

- [ ] `actions.ts` com `"use server"` no topo.
- [ ] Valida input com o schema Zod (re-valida no server, mesmo que o client tenha validado).
- [ ] `requireUser()` se precisa autenticação.
- [ ] Chama API externa com token (`LUCIDA_CLIENT_TOKEN` via `process.env`).
- [ ] Erros esperados → `return { ok: false, ... }`. Erros imprevistos → throw.
- [ ] `revalidateTag` / `revalidatePath` nos caches afetados.
- [ ] `redirect(...)` se o fluxo termina em outra rota.

Referência: [data-fetching.md](data-fetching.md).

## Passo 4 — Server component (página)

- [ ] `page.tsx` começa como async function.
- [ ] Data fetching via `await` (não useEffect, não TanStack).
- [ ] Chama funções de `features/<feature>/queries.ts` ou direto na page se é uma query única.
- [ ] Early return para estados vazios.
- [ ] Passa dados já prontos para client components filhos via props.
- [ ] Se houver múltiplos fetches independentes, `Promise.all`.

## Passo 5 — Client components (se houver interação)

Para cada pedaço interativo:

- [ ] `"use client"` no topo **só** se tem state/event/ref/browser API.
- [ ] Arquivo no mesmo folder da page se usado só lá.
- [ ] Arquivo em `features/<feature>/components/` se reutilizado.
- [ ] Props tipadas com `interface` (`<Name>Props`).
- [ ] Tamanho: <150 linhas. Se passar, decomponha.
- [ ] `className?: string` opcional para override do consumidor.
- [ ] Loading/error/empty states como sub-componentes ou early returns.

Referência: [component-patterns.md](component-patterns.md).

## Passo 6 — Forms (se aplicável)

- [ ] `useForm` com `zodResolver(schema)` e `defaultValues`.
- [ ] `FormField` + `FormItem` + `FormControl` + `FormMessage` (shadcn).
- [ ] `useTransition` para `isPending` da action.
- [ ] Error handling com `form.setError("root"|"field", ...)`.
- [ ] Mensagens em pt-BR.
- [ ] Submit button disabled durante pending.
- [ ] Labels e placeholders claros.

Referência: [forms.md](forms.md).

## Passo 7 — Estilização com tokens da marca

- [ ] Cores **sempre** via `bg-brand-*`, `text-brand-*`, `border-brand-*`. Zero hex hardcoded.
- [ ] Tipografia via classes da hierarquia (`text-display`, `text-heading`, `text-body`, `text-detail`).
- [ ] Use `font-serif italic` apenas para destaques de 1-3 palavras em headings.
- [ ] Radii via tokens (`rounded-md`, `rounded-lg`, `rounded-pill` para tags/pílulas).
- [ ] Classes condicionais via `cn()`.
- [ ] Variants via `cva()` se o componente tem 2+ aparências.
- [ ] Hero dark: `bg-brand-super-dark text-brand-off-white`.
- [ ] Bg claro alternativo: `bg-brand-off-white`.

Referência: [brand-tokens.md](brand-tokens.md).

## Passo 8 — Acessibilidade

- [ ] Tags semânticas (`section`, `nav`, `main`, `article`, `h1..h6`).
- [ ] Labels em todos inputs (shadcn FormField resolve).
- [ ] `alt` em todas imagens (vazio `alt=""` se decorativa).
- [ ] `aria-label` em botões só com ícone.
- [ ] Contraste checado — para texto pequeno em cor da marca, use `brand-dark-01`.
- [ ] Focus visível em todos interativos.
- [ ] Tab order lógico.
- [ ] `role="alert"` para feedback de erro.

Referência: [quality-a11y-perf.md](quality-a11y-perf.md).

## Passo 9 — Performance

- [ ] `next/image` em toda imagem, com `width`/`height`.
- [ ] `priority` só em LCP image (1 por página).
- [ ] `next/font` para fontes (já setado no root layout).
- [ ] `dynamic()` para client components pesados não críticos.
- [ ] `Promise.all` em fetches paralelos.
- [ ] Server component quando dá — cada client component a menos = menos JS.

## Passo 10 — Estado (se necessário)

- [ ] UI transient local → `useState`.
- [ ] UI compartilhada entre componentes distantes → Zustand store em `stores/`.
- [ ] Estado que deve ser bookmarkável/compartilhável → URL (`searchParams`).
- [ ] Data do servidor → server component ou TanStack Query. **Nunca** em Zustand.

Referência: [state-management.md](state-management.md).

## Passo 11 — Verificação

- [ ] `tsc --noEmit` passa (sem type errors).
- [ ] `next build` passa.
- [ ] Lint passa.
- [ ] Testado happy path manualmente no browser.
- [ ] Testado 401 / erro de validação / erro de rede.
- [ ] Checado no mobile (DevTools responsive).
- [ ] Lighthouse: LCP < 2.5s, CLS < 0.1, sem erros críticos a11y.

## Exemplo mental antes de começar

Antes de escrever, rascunhe em texto:

```
Feature: criar prova
Rota: /dashboard/exams/new
Auth: sim (dentro de (app)/)
Dados prévios: templates de prova (server component fetch)
Mutation: createExam server action
Form fields: title, durationMinutes, questionStyle, description
Validação: createExamSchema (zod)
Estado: isPending (useTransition), form state (RHF)
Navegação pós-sucesso: redirect para /dashboard/exams/:id
Estilização: hero com bg-brand-off-white, form em Card branco centered
Mobile: stack vertical, inputs full-width
```

Se você não consegue escrever isso, **volte a fazer perguntas**.

## Ordem não-negociável

1. Rota + schema primeiro.
2. Server action depois.
3. Server component (page) depois.
4. Client components (formulário, interatividade) por último.
5. Wiring e testes manuais no final.

Começar pelo client quando dá para ser server é retrabalho garantido — provavelmente você vai descobrir que o fetch podia ser no server, e refaz.

## Sinais de deviação (OK)

- **Landing page estática**: sem action, sem store, sem form complexo. Passos 3 (action), 6 (form), 10 (estado) são pulados.
- **Página de integração externa** (ex: embed de vídeo): provavelmente tudo server component + um client component isolado. Passos 5, 10 podem ser mínimos.
- **Dashboard tempo real**: vai depender muito de TanStack Query em vez de server component puro. Passo 4 fica reduzido, passo 5 fica maior.

Adapte à natureza da tela, mas nunca pule schemas (passo 2) quando há form, e nunca hardcode cor.
