# shadcn/ui — Setup e Customização

shadcn/ui **não é uma biblioteca** — é um CLI que copia código de componentes para o seu repo. Você é dono de cada primitive. Isso é vantagem: dá para customizar fundo sem dar fork.

## Install inicial

```bash
# com pnpm (padrão do workspace)
pnpm dlx shadcn@latest init
```

Responda:
- **Style**: `New York` (mais moderno, tight) — combina com a identidade minimalista do manual.
- **Base color**: Slate (vamos sobrescrever com brand depois).
- **CSS variables**: `yes` — essencial para tokens da marca via `@theme`.

Isso cria:
- `components.json` — config do CLI.
- `src/lib/utils.ts` com `cn()`.
- `src/app/globals.css` (se não existia).

## `components.json` — config do workspace

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Note `"config": ""` — Tailwind v4 **não usa mais `tailwind.config.ts`** (config é em CSS `@theme`).

## Adicionar componentes

```bash
pnpm dlx shadcn@latest add button input form dialog dropdown-menu toast
```

Cada comando baixa o código do componente para `src/components/ui/<name>.tsx`. Edite à vontade — é seu código agora.

## Customizando para a marca

shadcn usa tokens semânticos (`primary`, `secondary`, `destructive`, `accent`, `muted`, `background`, `foreground`). Já mapeamos eles no `@theme` do `globals.css` (ver [brand-tokens.md](brand-tokens.md)):

```css
--color-primary:              var(--color-brand-primary);
--color-primary-foreground:   #FFFFFF;
--color-ring:                 var(--color-brand-primary);
```

Isso significa que todos os componentes shadcn que usam `bg-primary`, `text-primary-foreground`, `ring-ring` **já saem com as cores da marca** sem tocar em um componente sequer.

## Tweaks por componente

Mesmo com os tokens mapeados, alguns componentes precisam de ajuste fino para combinar com o manual. Faça o tweak direto no arquivo copiado.

### Button — adicionar variant `brand` e `pill`

`src/components/ui/button.tsx` — encontre o `buttonVariants = cva(...)` e adicione:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-brand-dark-01",
        secondary: "bg-brand-super-dark text-brand-off-white hover:bg-brand-super-dark/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-brand-dark-01 underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm:   "h-8  px-3 text-xs rounded-md",
        md:   "h-10 px-4 rounded-md",
        lg:   "h-12 px-6 text-base rounded-md",
        pill: "h-10 px-6 rounded-pill",       // ← pílula do manual (tags Lucida Exam)
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);
```

Uso:

```tsx
<Button variant="default" size="pill">Pedir para Lulu fazer agora</Button>
<Button variant="secondary">Saiba mais</Button>
```

### Input — focus ring na cor da marca

`src/components/ui/input.tsx`:

```tsx
<input
  className={cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  {...props}
/>
```

### Dialog — bordas e sombra da marca

Em `components/ui/dialog.tsx`, encontre `DialogContent` e ajuste:

```tsx
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4",
  "border border-border bg-background p-6 shadow-pop duration-200 rounded-lg",
  // animations...
  className,
)}
```

## `cn()` helper

shadcn coloca em `src/lib/utils.ts`. Mova para `src/lib/cn.ts` (mais descritivo):

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Atualize `components.json` → `"utils": "@/lib/cn"`.

**Uso**:

```tsx
import { cn } from "@/lib/cn";

<div className={cn(
  "rounded-md border p-4",
  isActive && "border-brand-primary bg-brand-light/10",
  className,           // sempre deixe o consumidor sobrescrever
)} />
```

Regra: `className` do prop sempre **vem por último**, para permitir override.

## Adicionando componente novo fora da lista shadcn

Quando shadcn não tem o primitive (ex: `CommandPalette` customizado), **siga o mesmo padrão**:
1. Arquivo em `src/components/ui/<name>.tsx`.
2. `cva()` para variants.
3. `cn()` para merge de classes.
4. `asChild` via Radix `Slot` quando fizer sentido.
5. Ref forwarding: prefira `ComponentProps<"button">` com ref direto (React 19 não precisa mais de `forwardRef`).

Exemplo:

```tsx
// src/components/ui/badge.tsx
import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand-light text-brand-dark-02",
        primary: "bg-brand-primary text-white",
        outline: "border border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

## Atualizando shadcn depois

Quando o projeto shadcn atualiza um componente e você quer pegar o novo código:
1. Rode `pnpm dlx shadcn@latest add <component>` de novo.
2. Vai pedir pra sobrescrever — **faça diff antes**, não confie cegamente. Você pode ter customizações locais.
3. Re-aplique as customizações perdidas.

Alternativa: trate os componentes `ui/` como código próprio e atualize manualmente quando for útil. Não é biblioteca — não existe "upgrade automático".

## Componentes icônicos

`lucide-react` é o padrão do shadcn. Já instalado via `init`.

```tsx
import { ArrowRight, Check, X } from "lucide-react";

<Button>
  Continuar <ArrowRight className="h-4 w-4" />
</Button>
```

Ícones têm tamanho fixo via classe: `h-4 w-4` para inline em texto, `h-5 w-5` em botões médios, `h-6 w-6` em CTAs grandes. **Nunca inline SVG** para ícones que já existem no Lucide.
