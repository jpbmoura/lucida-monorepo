# Data Fetching

Três caminhos, um por cenário:

1. **Server Component (`async`/`await`)** — leitura no render inicial, sem interação.
2. **Server Action** — mutation disparada do client (form submit, botão, etc.).
3. **TanStack Query** — leitura client-side com cache, polling, paginação infinita, invalidation.

**Regra de escolha**: se der para buscar no server component → faça. Se é mutation → server action. TanStack Query só quando precisa de algum recurso que server component não tem (cache entre navegações, revalidação em foco, optimistic UI complexa).

## 1. Server Component

```tsx
// app/dashboard/exams/page.tsx — server component por padrão
import { getExamsForUser } from "@/features/exam/queries";
import { requireUser } from "@/server/auth";
import { ExamCard } from "@/features/exam/components/exam-card";

export default async function ExamsPage() {
  const user = await requireUser();
  const exams = await getExamsForUser(user.id);

  if (exams.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {exams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
    </ul>
  );
}
```

Onde `getExamsForUser`:

```ts
// src/features/exam/queries.ts
import "server-only";    // ← força erro se alguém importar do client
import { cache } from "react";

export const getExamsForUser = cache(async (userId: string) => {
  const res = await fetch(`${process.env.API_URL}/v1/exams?userId=${userId}`, {
    headers: { Authorization: `Bearer ${process.env.LUCIDA_CLIENT_TOKEN}` },
    next: { revalidate: 60, tags: [`user:${userId}:exams`] },
  });
  if (!res.ok) throw new Error("Failed to fetch exams");
  return res.json() as Promise<Exam[]>;
});
```

Pontos:
- `import "server-only"` — o bundler vai quebrar o build se um client component tentar importar (trava clean).
- `cache()` do React deduplica chamadas no mesmo render (útil se vários componentes buscam o mesmo).
- `next: { revalidate: 60 }` — cache do Next, revalida a cada 60s.
- `next: { tags }` — permite invalidar por tag em server actions (`revalidateTag(...)`).

### Suspense e loading

Para streaming de partes lentas:

```tsx
import { Suspense } from "react";
import { ExamListSkeleton } from "./exam-list-skeleton";

export default function Page() {
  return (
    <div>
      <h1 className="text-heading">Provas</h1>
      <Suspense fallback={<ExamListSkeleton />}>
        <ExamList />
      </Suspense>
    </div>
  );
}

async function ExamList() {
  const exams = await getExamsForUser(userId);
  // ...
}
```

Ou use o padrão `loading.tsx` automático do App Router:

```
app/dashboard/exams/
  page.tsx
  loading.tsx       ← renderizado enquanto page.tsx resolve
```

## 2. Server Action

```ts
// app/dashboard/exams/new/actions.ts
"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createExamSchema } from "./schemas";

export async function createExam(input: z.infer<typeof createExamSchema>) {
  const user = await requireUser();
  const parsed = createExamSchema.parse(input);   // revalida no server

  const res = await fetch(`${process.env.API_URL}/v1/exams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LUCIDA_CLIENT_TOKEN}`,
    },
    body: JSON.stringify({ ...parsed, ownerId: user.id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao criar prova");
  }

  revalidateTag(`user:${user.id}:exams`);
  redirect(`/dashboard/exams/${(await res.json()).examId}`);
}
```

**Regras**:
- `"use server"` **no topo do arquivo** (não dentro da função, embora exista — prefira arquivo).
- Sempre re-valide input com Zod no servidor, mesmo que o client já tenha validado.
- Use `revalidateTag` / `revalidatePath` para invalidar caches de server components afetados.
- `redirect(...)` para navegar depois da mutation.
- Erros lançados viram `{ error }` no client se retornado como object, ou chegam no `error.tsx` boundary.

### Chamando do client com react-hook-form

Ver [forms.md](forms.md) para o padrão completo. Resumo:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createExam } from "./actions";
import { createExamSchema, type CreateExamInput } from "./schemas";

export function NewExamForm() {
  const form = useForm<CreateExamInput>({ resolver: zodResolver(createExamSchema) });

  async function onSubmit(values: CreateExamInput) {
    try {
      await createExam(values);
    } catch (err) {
      form.setError("root", { message: (err as Error).message });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>{/* ... */}</form>
  );
}
```

### Server action como `action` do `<form>` (sem client JS)

Para fluxos simples, o form pode disparar a action sem hidratação:

```tsx
// server component
<form action={createExam}>
  <input name="title" />
  <button type="submit">Criar</button>
</form>
```

Mas perde validação client-side e feedback rico. Use isso **só** para forms triviais (logout, delete confirm). Para o resto, react-hook-form + action via função.

## 3. TanStack Query

Use quando:
- Lista paginada infinita (scroll).
- Polling (atualização a cada X segundos).
- Revalidação em foco de janela.
- Optimistic updates complexos com rollback.
- Dados que mudam durante a sessão sem navegação (notificações, presence).

**Não use** para dados que aparecem no primeiro paint — server component é superior.

### Setup

```bash
pnpm add @tanstack/react-query
```

Provider no root layout (client boundary):

```tsx
// src/components/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

```tsx
// app/layout.tsx (server component)
import { Providers } from "@/components/providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Query hooks por feature

```ts
// src/features/exam/queries.ts (seção client)
"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

interface ExamsPage {
  items: Exam[];
  nextCursor: string | null;
}

export function useExamsQuery(userId: string) {
  return useQuery({
    queryKey: ["exams", userId],
    queryFn: async () => {
      const res = await fetch(`/api/exams?userId=${userId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Exam[]>;
    },
  });
}

export function useExamsInfinite(userId: string) {
  return useInfiniteQuery({
    queryKey: ["exams", "infinite", userId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/exams?userId=${userId}&cursor=${pageParam ?? ""}`);
      return res.json() as Promise<ExamsPage>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
```

### Mutations com TanStack Query

Prefira **server action** quando possível. Use `useMutation` só quando:
- Precisa de cache/invalidação coordenada com queries TanStack.
- Optimistic update com rollback em erro.
- Polling durante mutation.

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useToggleExamPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examId: string) => {
      const res = await fetch(`/api/exams/${examId}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onMutate: async (examId) => {
      // optimistic update
      await queryClient.cancelQueries({ queryKey: ["exams"] });
      const prev = queryClient.getQueryData<Exam[]>(["exams"]);
      queryClient.setQueryData<Exam[]>(["exams"], (old) =>
        old?.map(e => e.id === examId ? { ...e, isPublished: !e.isPublished } : e),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["exams"], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}
```

## Mistura: hydrate server → client

Quando quer server-render primeiro + continuar com TanStack no client:

```tsx
// page.tsx (server)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function Page() {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ["exams", userId],
    queryFn: () => getExamsForUser(userId),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ExamListClient userId={userId} />
    </HydrationBoundary>
  );
}
```

Server faz o fetch inicial, hidrata o cache TanStack. Client-side `useExamsQuery` pega do cache (sem refetch no mount) e depois assume revalidation.

## Mostrando erros

Server component → dispare dentro do fetch; o `error.tsx` pega:

```tsx
// app/dashboard/exams/error.tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Erro ao carregar provas.</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  );
}
```

Server action → capture no client:

```tsx
try {
  await createExam(values);
} catch (err) {
  toast.error((err as Error).message);
}
```

TanStack Query → `error` do hook.

## Anti-patterns

- ❌ `useEffect(() => { fetch('/api/...').then(setData) }, [])` quando o dado pode ser fetched no server component.
- ❌ Chamar API externa (lucida-api-v2) direto do client — passa token via server action/route proxy.
- ❌ Server action que não revalida tag/path relevante — o cache do server component fica stale.
- ❌ `"use server"` dentro de função em client component sem arquivo dedicado — funciona, mas vira bagunça rápido.
- ❌ TanStack Query para dado do primeiro paint. É mais lento que server component.
- ❌ Chamar server action em `useEffect` no mount — isso é fetching, e fetching deve ser server component ou TanStack.
