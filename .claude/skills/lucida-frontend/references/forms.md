# Forms (react-hook-form + Zod + Server Action)

Padrão único para forms do projeto:

- **Zod** define o schema (fonte da verdade, tipado).
- **react-hook-form** gerencia estado, validação client, render de erros.
- **Server action** recebe os dados validados e mutates server-side.
- **shadcn Form components** para UI consistente.

## Install

```bash
pnpm add react-hook-form zod @hookform/resolvers
pnpm dlx shadcn@latest add form input label
```

## Estrutura de 4 arquivos por form

```
app/dashboard/exams/new/
  page.tsx                 ← server component, renderiza <NewExamForm />
  new-exam-form.tsx        ← client component, usa react-hook-form
  actions.ts               ← "use server", action createExam
  schemas.ts               ← zod schema + tipos inferidos
```

## 1. `schemas.ts` — fonte da verdade

```ts
import { z } from "zod";

export const createExamSchema = z.object({
  title: z.string()
    .trim()
    .min(3, "Título deve ter ao menos 3 caracteres")
    .max(120, "Título muito longo"),
  durationMinutes: z.coerce.number()
    .int()
    .min(5, "Duração mínima de 5 minutos")
    .max(600, "Duração máxima de 10 horas"),
  questionStyle: z.enum(["enem", "enade", "simple", "skillow"]),
  description: z.string().max(500).optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
```

- **Mensagens em pt-BR** (padrão do projeto).
- `z.coerce.number()` para inputs type="number" (vem como string do DOM).
- `.trim()` em strings livres.
- `.optional()` só para campos genuinamente opcionais; prefira `.default("")` quando é texto.

## 2. `actions.ts` — server action

```ts
"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createExamSchema, type CreateExamInput } from "./schemas";

export async function createExam(input: CreateExamInput) {
  const parsed = createExamSchema.parse(input);   // revalida no server
  const user = await requireUser();

  const res = await fetch(`${process.env.API_URL}/v1/exams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LUCIDA_CLIENT_TOKEN}`,
    },
    body: JSON.stringify({ ...parsed, ownerId: user.id }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Erro controlado — retorne como object (não throw) para UI tratar campo a campo.
    // Throw para erros 5xx/infra imprevistos.
    if (res.status === 409) {
      return { ok: false, formError: "Você já tem uma prova com esse título" };
    }
    throw new Error(body.message ?? "Falha ao criar prova");
  }

  const { examId } = await res.json() as { examId: string };
  revalidateTag(`user:${user.id}:exams`);
  redirect(`/dashboard/exams/${examId}`);
}
```

**Decisão**: erros **esperados** (conflito, quota excedida) → retorne `{ ok: false, formError|fieldErrors }`. Erros **imprevistos** (timeout, 500, bug) → `throw` e deixa o `error.tsx` pegar.

## 3. `new-exam-form.tsx` — client component

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createExam } from "./actions";
import { createExamSchema, type CreateExamInput } from "./schemas";

const DEFAULTS: CreateExamInput = {
  title: "",
  durationMinutes: 60,
  questionStyle: "enem",
  description: "",
};

export function NewExamForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateExamInput>({
    resolver: zodResolver(createExamSchema),
    defaultValues: DEFAULTS,
  });

  function onSubmit(values: CreateExamInput) {
    startTransition(async () => {
      try {
        const result = await createExam(values);
        if (result && !result.ok) {
          form.setError("root", { message: result.formError });
        }
      } catch (err) {
        form.setError("root", { message: (err as Error).message });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Prova de Cálculo 1" {...field} />
              </FormControl>
              <FormDescription>Aparece para os alunos.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duração (minutos)</FormLabel>
              <FormControl>
                <Input type="number" min={5} max={600} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="questionStyle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estilo das questões</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="enem">ENEM</SelectItem>
                  <SelectItem value="enade">ENADE</SelectItem>
                  <SelectItem value="simple">Simples</SelectItem>
                  <SelectItem value="skillow">Skillow</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root?.message && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Criando..." : "Criar prova"}
        </Button>
      </form>
    </Form>
  );
}
```

**Pontos**:
- `useTransition` → `isPending` combina com a duração da server action. Preferível a `useState(loading)`.
- `form.setError("root", ...)` para erros gerais (não associados a campo).
- `form.setError("title", ...)` se a action retornar erro específico de campo.
- `DEFAULTS` fora do componente para evitar re-criar objeto a cada render.
- `field` do `FormField` já inclui `value`, `onChange`, `onBlur`, `name`, `ref` — espalhe em `{...field}`.
- Componentes controlados (Select, Checkbox) podem precisar mapear manualmente: `onValueChange={field.onChange}`.

## 4. `page.tsx` — server component shell

```tsx
import { NewExamForm } from "./new-exam-form";

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-heading font-sans text-brand-super-dark">Nova prova</h1>
      <p className="mt-2 text-body font-light text-brand-super-dark/70">
        Configure sua prova e a IA gerará as questões com base no material.
      </p>

      <div className="mt-10">
        <NewExamForm />
      </div>
    </div>
  );
}
```

## Padrões auxiliares

### Erros específicos de campo vindos da action

```ts
// action
if (titleAlreadyUsed) {
  return { ok: false, fieldErrors: { title: "Título já existe" } };
}
```

```tsx
// form
const result = await createExam(values);
if (result && !result.ok) {
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([key, message]) => {
      form.setError(key as keyof CreateExamInput, { message });
    });
  } else if (result.formError) {
    form.setError("root", { message: result.formError });
  }
}
```

### Campos dinâmicos (array field)

```tsx
import { useFieldArray } from "react-hook-form";

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "questions",
});

{fields.map((field, index) => (
  <div key={field.id}>
    <FormField
      control={form.control}
      name={`questions.${index}.statement`}
      render={({ field }) => (<Input {...field} />)}
    />
    <Button type="button" onClick={() => remove(index)}>Remover</Button>
  </div>
))}

<Button type="button" onClick={() => append({ statement: "", options: [] })}>
  Adicionar questão
</Button>
```

Schema:

```ts
export const questionSchema = z.object({
  statement: z.string().min(1),
  options: z.array(z.string()).min(2),
});

export const createExamSchema = z.object({
  title: z.string().min(3),
  questions: z.array(questionSchema).min(1, "Adicione ao menos uma questão"),
});
```

### Toast de sucesso (com shadcn `sonner`)

Quando a action faz `redirect`, a mensagem de sucesso vive na página destino. Para fluxos que não redirecionam:

```tsx
import { toast } from "sonner";

startTransition(async () => {
  try {
    await updateExam(values);
    toast.success("Prova atualizada");
  } catch (err) {
    toast.error((err as Error).message);
  }
});
```

Instalar: `pnpm dlx shadcn@latest add sonner` — e adicionar `<Toaster />` no root layout.

## Acessibilidade em forms

- `FormLabel` do shadcn já associa com o input via `htmlFor` → `id` gerado.
- Erros aparecem em `FormMessage` com `role="alert"` e `aria-describedby` ligado ao input (shadcn faz).
- Botão submit disabled durante pending — use também `aria-busy={isPending}` em forms longos.
- Campo required visual + `aria-required="true"` se você mostra asterisco.

## Anti-patterns

- ❌ `useState` por campo. Use react-hook-form.
- ❌ Validação manual no submit (`if (!title) setError...`). Use Zod.
- ❌ Schema só no client. Server action **tem que** revalidar — cliente é hostil.
- ❌ Schema duplicado (um no form, outro na action). Um só, compartilhado.
- ❌ `onChange={(e) => form.setValue("title", e.target.value)}` — use `{...field}`.
- ❌ Server action retornando `throw` para erros esperados (validação, conflito). Retorne `{ ok: false }`.
- ❌ `alert()` ou `window.confirm()` para erros. Use toast ou `FormMessage`.
