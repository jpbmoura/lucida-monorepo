# Component Patterns (Clean Code React 19 + RSC)

Regras de escrita de componentes. Servem para client **e** server components, exceto onde marcado.

## Server Component vs Client Component

**Default: Server Component**. Marque `"use client"` **apenas** quando precisar de uma destas coisas no topo do arquivo:

- `useState`, `useReducer`, `useRef`, `useContext`, `useEffect`, outros hooks React de client.
- Event handlers (`onClick`, `onChange`, `onSubmit`). Exceção: `<form action={serverAction}>` funciona em server component.
- Browser APIs (`window`, `document`, `localStorage`, `IntersectionObserver`).
- Bibliotecas client-only (framer-motion, react-hook-form, zustand, most chart libs).

Se não precisa de nenhum desses — **é server component**. Server components:
- Não enviam JS para o client (performance).
- Podem `await` direto em fetching.
- Podem acessar ENV, DB, filesystem.
- Não podem ter estado, ref, effect, nem passar handlers para filhos como prop.

### Granularidade

Quebre na fronteira mínima. Se a página tem um form interativo e o resto é estático, só o form vira client:

```tsx
// app/dashboard/exams/new/page.tsx — SERVER component
import { getDefaultTemplates } from "@/features/exam/queries";
import { NewExamForm } from "./new-exam-form";

export default async function Page() {
  const templates = await getDefaultTemplates();   // fetching no server

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-heading">Nova prova</h1>
      <NewExamForm templates={templates} />        {/* client component com dados prontos */}
    </div>
  );
}
```

```tsx
// app/dashboard/exams/new/new-exam-form.tsx
"use client";

import { useForm } from "react-hook-form";
// ...

interface NewExamFormProps {
  templates: Template[];
}

export function NewExamForm({ templates }: NewExamFormProps) { /* ... */ }
```

Regra: **data fetching no server**, interatividade no client, props como contrato entre os dois.

### Client components podem conter server components?

Sim — **via `children` prop**. Client não pode importar server component, mas pode renderizá-lo como filho:

```tsx
// page.tsx (server)
<ClientShell>
  <ServerHeavyContent />     {/* server component renderizado dentro de client */}
</ClientShell>
```

```tsx
// client-shell.tsx
"use client";
export function ClientShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div>{open && children}</div>;
}
```

Útil para reduzir bundle: só o wrapper é client, conteúdo pesado fica server.

## Tipagem de props

Use `interface` com sufixo `Props`:

```tsx
interface ExamCardProps {
  exam: Exam;
  onEdit?: (id: string) => void;
  className?: string;
}

export function ExamCard({ exam, onEdit, className }: ExamCardProps) { /* ... */ }
```

- `interface`, não `type` (convenção — pode virar prática local; o importante é consistência).
- **Sem prefixo `I`**.
- `className?: string` **sempre** opcional para permitir override estilístico.
- Callbacks: `on + Verbo + Noun` (`onSubmit`, `onExamCreated`).
- Boolean props: adjetivos ou `is*` (`disabled`, `loading`, `isCompact`).

## Composition over props

Em vez de ir adicionando props, exponha slots:

```tsx
// ❌ prop explosion
<Card
  title="..."
  description="..."
  action={<Button>...</Button>}
  icon={<Icon />}
  footer={<Footer />}
/>

// ✅ composition
<Card>
  <CardHeader>
    <CardIcon><Icon /></CardIcon>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>...</Button>
  </CardFooter>
</Card>
```

shadcn já segue esse padrão. Novos componentes compostos devem seguir.

## `asChild` com Radix Slot

Quando um componente precisa se transformar em outro elemento (ex: Button virando `<Link>`), use `asChild`:

```tsx
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function Button({ asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}
```

Uso:

```tsx
<Button asChild>
  <Link href="/dashboard">Ir para dashboard</Link>
</Button>
```

Slot mescla props e ref do Button no Link — sem virar `<button><a></a></button>` inválido.

Anti-pattern:

```tsx
// ❌ prop `as` que vira if gigante
<Button as="a" href="/...">...</Button>
```

## Variantes com `cva`

Para componentes com múltiplas aparências, `class-variance-authority` (já vem com shadcn):

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const alertVariants = cva("rounded-md border p-4", {
  variants: {
    variant: {
      info:    "border-brand-primary bg-brand-light/10 text-brand-dark-02",
      success: "border-green-500 bg-green-50 text-green-900",
      warning: "border-amber-500 bg-amber-50 text-amber-900",
      error:   "border-destructive bg-red-50 text-red-900",
    },
  },
  defaultVariants: { variant: "info" },
});

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
```

## `cn()` para classes condicionais

```tsx
// ❌
<div className={`rounded p-4 ${isActive ? "bg-brand-primary" : ""}`}>

// ✅
<div className={cn("rounded p-4", isActive && "bg-brand-primary")}>
```

`cn()` também resolve conflitos (`tailwind-merge`):

```tsx
<div className={cn("p-4 bg-red-500", "bg-blue-500")}>
{/* final: "p-4 bg-blue-500" — últim��o ganha */}
```

Regra: `className` prop **sempre por último** para permitir override pelo consumidor.

## Early returns

JSX principal fica limpo quando estados intermediários viram early return:

```tsx
export function ExamList({ exams }: ExamListProps) {
  if (exams.length === 0) {
    return <EmptyState message="Você ainda não tem provas" />;
  }

  return (
    <ul className="grid gap-4">
      {exams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
    </ul>
  );
}
```

Em client components, loading/error states viram components dedicados:

```tsx
"use client";

export function ExamListClient() {
  const { data, isPending, error } = useExamsQuery();

  if (isPending) return <ExamListSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data || data.length === 0) return <EmptyState />;

  return <ul>{data.map(e => <ExamCard key={e.id} exam={e} />)}</ul>;
}
```

Cada estado é um componente próprio (`ExamListSkeleton`, `EmptyState`, `ErrorState`). Não inline 20 linhas de skeleton dentro do `if`.

## Decomposição

**Regra**: componente passa de ~150 linhas de código ou tem mais de uma responsabilidade → decomponha.

Red flags:
- Mais de 4-5 níveis de aninhamento JSX.
- Muitos `useState` (>3-4). Pode ser `useReducer` ou store Zustand.
- `if` de layout ("se tem hero, mostra x, se tem banner, mostra y") — vira componentes diferentes.
- Nome genérico (`Wrapper`, `Container`) quando poderia ser específico.

## Ref forwarding (React 19)

React 19 **não precisa mais de `forwardRef`** — `ref` é uma prop normal:

```tsx
// ❌ padrão antigo
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// ✅ React 19
interface InputProps extends React.ComponentProps<"input"> {}

export function Input({ ref, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}
```

## Eventos com argumentos fixos

Não crie arrow function nova a cada render quando dá para usar dataset ou currying:

```tsx
// ❌ nova função a cada item a cada render
{items.map(item => (
  <button onClick={() => handleClick(item.id)}>{item.name}</button>
))}

// ✅ ainda aceitável para handlers simples (overhead é mínimo)
// ✅ melhor quando handler é pesado ou compartilhado:
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  const id = e.currentTarget.dataset.id!;
  // ...
}

{items.map(item => (
  <button data-id={item.id} onClick={handleClick}>{item.name}</button>
))}
```

Na maioria dos casos a primeira forma é ok. Só preocupe com isso em listas grandes ou componentes críticos de perf.

## Key em listas

- **Sempre** um valor estável e único (id do domínio).
- **Nunca** `index` do array se a lista é reordenável/filtrável.
- **Nunca** `Math.random()` ou `Date.now()` — quebra reconciliação.

```tsx
{exams.map(e => <ExamCard key={e.id} exam={e} />)}
```

## Imports ordenados

Ordem:
1. React / Next.
2. Libs externas (npm).
3. `@/` absolutos.
4. Relativos (`./`, `../`).

```tsx
import { Suspense } from "react";
import Link from "next/link";

import { z } from "zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { NewExamForm } from "./new-exam-form";
import { createExamSchema } from "./schemas";
```

Use um plugin ESLint (`eslint-plugin-import` com `import/order`) para automatizar.

## Anti-patterns (red flags em review)

- ❌ `"use client"` em arquivo sem hook/event/browser API.
- ❌ Prop drilling mais de 2 níveis — crie Context ou store.
- ❌ `useEffect` para transformar props em state (use `useMemo` ou derive direto no render).
- ❌ `useEffect` para fetching quando dá para server component.
- ❌ `dangerouslySetInnerHTML` — só com sanitização explícita (DOMPurify) e motivo claro.
- ❌ `any` em props ou retorno. `unknown` + narrowing é aceitável em casos raros.
- ❌ `default export` de componente quando tem mais de um export no arquivo. Prefira named.
- ❌ Arquivo com 10 componentes pequenos — separe. Arquivo com 1 componente de 500 linhas — decomponha.
