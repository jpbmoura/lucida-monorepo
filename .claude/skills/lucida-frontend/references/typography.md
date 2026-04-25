# Tipografia

Duas famílias do manual:

- **Poppins** — institucional. Sans-serif geométrica, pesos `Light (300)`, `Regular (400)`, `Medium (500)`, `SemiBold (600)`, `Bold (700)`.
- **Instrument Serif** — apoio / destaque. Serif condensada, usada frequentemente em **italic** para palavras-chave ("*rápida*", "*prática*", "*perfeito*").

## Setup com `next/font` (obrigatório)

Fontes web **sempre** via `next/font`. Auto-hosted, zero CLS, preload automático.

```tsx
// src/app/layout.tsx
import { Poppins, Instrument_Serif } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

E no `globals.css`:

```css
@theme {
  --font-sans:  var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-instrument-serif), ui-serif, Georgia, serif;
}
```

Depois, em qualquer componente:

```tsx
<p className="font-sans">Texto institucional em Poppins</p>
<em className="font-serif italic text-brand-dark-01">destaque</em>
```

**Nunca** use `@font-face` manual ou `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`. Quebra o padrão, perde o bundling do Next e causa CLS.

## Hierarquia tipográfica (manual Lucida)

Valores calibrados do manual:

| Token | Uso | Classe | CSS |
|---|---|---|---|
| `text-display` | Hero, manchete | `text-display font-sans font-normal leading-none` | `font-size: 4.5rem; line-height: 1;` |
| `text-heading` | Sub-título seção | `text-heading font-sans font-normal leading-none` | `font-size: 2.5rem; line-height: 1;` |
| `text-body` | Parágrafo | `text-body font-sans font-normal` | `font-size: 1.25rem; line-height: 1.5;` |
| `text-detail` | Legenda, meta | `text-detail font-sans font-light` | `font-size: 1.125rem; line-height: 1.55;` |

Os tokens `--text-*` já estão no `@theme` do `globals.css` (ver [brand-tokens.md](brand-tokens.md)).

### Exemplo de Hero seguindo a hierarquia

```tsx
<section className="bg-brand-off-white px-6 py-24">
  <h1 className="text-display font-sans font-normal text-brand-super-dark max-w-4xl">
    Crie provas com{" "}
    <em className="font-serif italic text-brand-primary not-italic:hidden">
      IA em segundos
    </em>
  </h1>

  <p className="text-body font-sans mt-6 max-w-2xl text-brand-super-dark/80">
    Transforme seu material didático em avaliações com IA.
    Rápido, inteligente e personalizado.
  </p>
</section>
```

Note o padrão: **Instrument Serif italic** aplicado só a 1-3 palavras-chave, resto em Poppins Regular. É assinatura da marca — siga.

## Regras de uso (do manual)

**Não faça** (páginas 32-35 do manual):
- ❌ Esticar ou distorcer texto (`transform: scale`).
- ❌ Outline em texto (`-webkit-text-stroke`).
- ❌ Kerning muito apertado (`tracking-tight` extremo). Padrão Tailwind (`tracking-normal`) é ok.
- ❌ Entrelinha muito apertada (`leading-none` só em display). Corpo de texto usa `leading-normal` ou `leading-relaxed`.
- ❌ Texto justificado (`text-justify`). Cria rios de espaço, rompe a grid visual. Use `text-left`.
- ❌ Qualquer outra fonte que não seja Poppins ou Instrument Serif.

**Faça**:
- ✅ Use `Instrument Serif italic` para 1-3 palavras de destaque dentro de um heading em Poppins.
- ✅ Peso `Light (300)` só em texto de detalhe (legendas); peso `Regular (400)` para corpo e títulos.
- ✅ `tracking-normal` ou `tracking-tight` em displays; nada mais apertado.

## Componentes tipográficos reutilizáveis

Para não repetir classes em todo lugar, crie primitives em `components/ui/typography.tsx`:

```tsx
import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";

const typographyVariants = cva("font-sans", {
  variants: {
    variant: {
      display: "text-display font-normal leading-none",
      heading: "text-heading font-normal leading-none",
      body:    "text-body font-normal leading-normal",
      detail:  "text-detail font-light leading-relaxed",
    },
  },
  defaultVariants: { variant: "body" },
});

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export function Typography({
  as: Component = "p",
  variant,
  className,
  ...props
}: TypographyProps) {
  return (
    <Component
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  );
}

export function Serif({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <em className={cn("font-serif italic not-italic:hidden", className)} {...props} />;
}
```

Uso:

```tsx
import { Typography, Serif } from "@/components/ui/typography";

<Typography as="h1" variant="display" className="text-brand-super-dark">
  Crie provas com <Serif className="text-brand-primary">IA em segundos</Serif>
</Typography>
```

## Responsividade

Mobile first. Em breakpoints menores, reduza displays:

```tsx
<h1 className="text-4xl md:text-heading lg:text-display">
  Título que escala
</h1>
```

Não customize por pixel. Use a escala Tailwind padrão (`text-4xl`, `text-5xl`…) em mobile e o token da marca em desktop.

## Antialiasing

Poppins fica melhor com:

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Inclua no `globals.css` uma vez.
