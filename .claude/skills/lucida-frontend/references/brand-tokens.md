# Brand Tokens (Lucida Exam + Lucida Analytics)

Todos os tokens vivem em `src/styles/globals.css` dentro do bloco `@theme` do Tailwind v4. Componentes consomem via classes Tailwind (`bg-brand-primary`, `text-brand-super-dark`, `bg-analytics-primary`) — **nunca hex inline**.

Três produtos, três paletas:
- **Lucida / Exam** usa `--color-brand-*` (azul `#007AFF`).
- **Lucida Analytics** usa `--color-analytics-*` (roxo `#6C3CFB`).
- **Kintal** (backoffice interno, `/kintal/*`) usa só neutros (`--color-ink`, `--color-gray-*`). Não tem token de produto próprio — a paleta P&B é construída remapeando as vars semânticas pros neutros já existentes.

Neutros (`--color-brand-super-dark`, `--color-brand-off-white`, escala `--color-gray-*`, `--color-ink`) são compartilhados entre os produtos — não duplique.

## `globals.css` — arquivo base

```css
@import "tailwindcss";

@theme {
  /* ───────── Lucida / Exam (azul — manual) ───────── */
  --color-brand-primary:     #007AFF;  /* Azul principal */
  --color-brand-dark-01:     #1D14FF;  /* Azul escuro 01 — texto em bg claro */
  --color-brand-dark-02:     #150BBC;  /* Azul escuro 02 */
  --color-brand-light:       #7FBDF4;  /* Azul claro — bg suave, accent */

  /* ───────── Lucida Analytics (roxo — manual) ───────── */
  --color-analytics-primary:    #6C3CFB;  /* Roxo principal */
  --color-analytics-dark-01:    #4D30CE;  /* Roxo escuro 01 — texto em bg claro */
  --color-analytics-dark-02:    #1E0A96;  /* Roxo escuro 02 */
  --color-analytics-light:      #927AFC;  /* Roxo claro — bg suave, accent */

  /* ───────── Neutros compartilhados ───────── */
  --color-brand-super-dark:  #051E2C;  /* Fundo dark da marca */
  --color-brand-off-white:   #F9F5EA;  /* Fundo claro alternativo */

  /* ───────── Semântica (mapeada para shadcn; default = Exam) ───────── */
  --color-background:        #FFFFFF;
  --color-foreground:        #051E2C;      /* super-dark para máximo contraste */
  --color-muted:             #F4F4F5;      /* zinc-100 */
  --color-muted-foreground:  #71717A;      /* zinc-500 */
  --color-border:            #E4E4E7;      /* zinc-200 */
  --color-input:             #E4E4E7;
  --color-ring:              var(--color-brand-primary);

  --color-primary:              var(--color-brand-primary);
  --color-primary-foreground:   #FFFFFF;
  --color-secondary:            var(--color-brand-super-dark);
  --color-secondary-foreground: var(--color-brand-off-white);
  --color-destructive:          #DC2626;   /* red-600 */
  --color-destructive-foreground: #FFFFFF;

  /* ───────── Tipografia ───────── */
  --font-sans:  "Poppins", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Instrument Serif", ui-serif, Georgia, serif;

  /* Escala de texto calibrada ao manual (70 / 40 / 20 / 18) em rem */
  --text-display:      4.5rem;    /* 72px ~ Título 70pt */
  --text-display--line-height: 1;
  --text-heading:      2.5rem;    /* 40px ~ Sub-título */
  --text-heading--line-height: 1;
  --text-body:         1.25rem;   /* 20px ~ Corpo */
  --text-body--line-height: 1.5;
  --text-detail:       1.125rem;  /* 18px ~ Detalhe */
  --text-detail--line-height: 1.55;

  /* ───────── Radii ───────── */
  --radius-sm: 0.25rem;
  --radius:    0.5rem;            /* default shadcn */
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-pill: 9999px;          /* usado nas "tags" (Lucida Exam em pílula) */

  /* ───────── Shadows (sutis, marca é minimalista) ───────── */
  --shadow-soft:    0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-pop:     0 10px 15px -3px rgb(0 122 255 / 0.15), 0 4px 6px -4px rgb(0 122 255 / 0.1);
  --shadow-focus:   0 0 0 3px rgb(0 122 255 / 0.25);
}

/* Troca de tema para Lucida Analytics — aplicar em qualquer wrapper
   (ex: <body className="theme-analytics"> num layout /org/*). Remapeia
   as vars semânticas pro roxo e as shadows azuis pras roxas, sem tocar
   nos tokens `--color-brand-*` originais. Componentes shadcn (Button,
   Input, Ring) herdam automaticamente. */
.theme-analytics {
  --color-ring:            var(--color-analytics-primary);
  --color-primary:         var(--color-analytics-primary);
  --color-primary-foreground: #FFFFFF;

  --shadow-pop:    0 10px 15px -3px rgb(108 60 251 / 0.18), 0 4px 6px -4px rgb(108 60 251 / 0.12);
  --shadow-focus:  0 0 0 3px rgb(108 60 251 / 0.28);
}

/* Troca de tema para Kintal (backoffice /kintal/*) — mesmo mecanismo,
   remapeia as vars semânticas pros neutros preto/cinza. Sem tokens de
   produto novos: só reuso do --color-ink e da escala --color-gray-*. */
.theme-kintal {
  --color-ring:    var(--color-gray-800);
  --color-accent:  var(--color-ink);
  --color-accent-foreground: #FFFFFF;

  --shadow-focus:  0 0 0 3px rgb(10 10 10 / 0.22);
}

/* Dark surface (fundo super-dark do manual) */
.surface-dark {
  background-color: var(--color-brand-super-dark);
  color: var(--color-brand-off-white);
}

/* Pequenos resets */
@layer base {
  html { font-family: var(--font-sans); }
  body { background: var(--color-background); color: var(--color-foreground); }
  * { border-color: var(--color-border); }
}
```

## Uso em Tailwind

Qualquer CSS var prefixada com `--color-*` vira classe utility automaticamente no Tailwind v4:

```tsx
{/* Exam (azul) */}
<button className="bg-brand-primary text-white hover:bg-brand-dark-01 rounded-pill px-6 py-3 font-sans">
  Criar prova
</button>

{/* Analytics (roxo) — mesma UI, só o token muda */}
<button className="bg-analytics-primary text-white hover:bg-analytics-dark-01 rounded-pill px-6 py-3 font-sans">
  Ver relatório
</button>

<section className="bg-brand-super-dark text-brand-off-white">
  {/* hero dark — neutro, compartilhado */}
</section>
```

### Alternativa: trocar o tema inteiro via `.theme-analytics`

Pra componentes genéricos que devem se adaptar ao produto sem saber disso (Button,
Input, Card do shadcn), envolva o layout da seção Analytics com `theme-analytics`
e use `bg-primary`/`text-primary` (as vars semânticas) em vez de `bg-brand-primary`:

```tsx
// app/org/layout.tsx  (ou o layout da rota Analytics)
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-analytics min-h-svh">{children}</div>;
}
```

Dentro de `theme-analytics`, `--color-primary` vira roxo automaticamente, então
`<Button>` do shadcn já sai roxo sem precisar de `variant="analytics"`. Use essa
forma quando o componente é compartilhado entre Exam e Analytics; use a forma
explícita (`bg-analytics-primary`) quando o componente é exclusivo de Analytics.

## Matriz de uso das cores (regras da marca)

### Exam (azul)

| Situação | Cor primária | Notas |
|---|---|---|
| Botão principal / CTA | `bg-brand-primary` + `text-white` | Contraste 3.04:1 — passa AA só para texto grande. Use `font-semibold` + mín. 16px. |
| Texto link em corpo | `text-brand-dark-01` | 8.2:1 em branco, AAA. |
| Texto sobre bg primário | `text-white` ou `text-brand-off-white` | |
| Hero dark | `bg-brand-super-dark text-brand-off-white` | Tema principal do manual. |
| Accent / bg suave | `bg-brand-light/20` ou `bg-brand-light` | Ótimo para highlights sutis. |
| Bg seção alternativo | `bg-brand-off-white` | Cor quente, combina com dark-super. |
| Texto destaque em heading | `text-brand-dark-01` + `font-serif italic` | Padrão do manual — palavras italicizadas em Instrument Serif. |

### Analytics (roxo)

| Situação | Cor primária | Notas |
|---|---|---|
| Botão principal / CTA | `bg-analytics-primary` + `text-white` | Contraste 4.98:1 em branco — passa AA pra texto normal ≥ 14pt. |
| Texto link em corpo | `text-analytics-dark-01` | ~7.3:1 em branco, AAA. |
| Texto sobre bg primário | `text-white` ou `text-brand-off-white` | Neutro compartilhado. |
| Hero dark | `bg-brand-super-dark text-analytics-light` | Links/accents em `--color-analytics-light` sobre super-dark. |
| Accent / bg suave | `bg-analytics-light/20` ou `bg-analytics-light` | Highlights sutis, cards de KPI. |
| Texto destaque em heading | `text-analytics-dark-01` + `font-serif italic` | Mesmo padrão Exam, só muda o token. |

**⚠️ Regra de contraste**:
- `#007AFF` (Exam) em branco é WCAG AA **apenas** para texto ≥ 18pt (24px) ou ≥ 14pt (18.66px) bold. Para texto pequeno, use `--color-brand-dark-01` (8.2:1).
- `#6C3CFB` (Analytics) em branco é WCAG AA pra texto normal (~4.98:1), mas pra corpo pequeno ou metadados prefira `--color-analytics-dark-01` (~7.3:1).
- Ferramenta: <https://webaim.org/resources/contrastchecker/>.

## Tokens de espaçamento

Tailwind v4 já tem escala `0`, `0.5`, `1`, `1.5`, `2`, `3`, `4`, `6`, `8`, `12`, `16`, `24`, `32`... em múltiplos de `0.25rem`. **Não customize** a menos que precise de uma grid específica. Use `p-4 m-6 gap-8` etc.

## Tokens de radii

- `rounded-sm` (0.25rem) — chips pequenos
- `rounded` / `rounded-md` (0.5rem) — inputs, cards
- `rounded-lg` (0.75rem) — dialogs, painéis
- `rounded-xl` (1rem) — cards grandes (hero)
- `rounded-pill` (9999px) — **tags** do manual (ex: "LucidaExam" com `Exam` em pílula azul-clara)

## Z-index scale (para evitar z-[9999])

Tailwind tem `z-0, z-10, z-20, z-30, z-40, z-50`. Reserve:
- `z-10` — conteúdo sobre fundos
- `z-20` — tooltips inline
- `z-30` — sticky headers
- `z-40` — dropdowns / popovers
- `z-50` — modais / dialogs / toasts

Se precisar passar de `z-50`, re-arquitete (provavelmente tem hierarquia errada).

## Usando CSS vars fora do Tailwind

Raro, mas se precisar em `style={{}}` inline ou em CSS custom:

```tsx
<div style={{ background: "var(--color-brand-primary)" }} />
```

Prefira a classe Tailwind. Fallback só quando precisar de valor dinâmico (ex: background calculado).

## Logo e elementos gráficos

Assets SVG em `public/brand/`:
- `public/brand/logo-lucida.svg` — logo completo (azul, Exam-default)
- `public/brand/logo-lucida-exam.svg` — com pílula "Exam"
- `public/brand/logo-lucida-analytics.svg` — logo completo em roxo, com pílula "Analytics"
- `public/brand/symbol.svg` — só o símbolo (azul)
- `public/brand/symbol-analytics.svg` — só o símbolo (roxo)
- `public/brand/lulu-*.svg` — mascote (traços pretos, sem preenchimento, pontas arredondadas)
- `public/brand/kintal/logo-lucida-bw.svg` — logo completo em preto (Kintal, fundos claros)
- `public/brand/kintal/logo-lucida-white.svg` — logo completo em branco (Kintal, fundos escuros)
- `public/brand/kintal/symbol-lucida-bw.svg` — só o símbolo em preto (Kintal)

Componente `<Logo />` em `src/components/brand/logo.tsx`:

```tsx
import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  variant?: "full" | "symbol" | "exam" | "analytics" | "symbol-analytics";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  const src = {
    full:              "/brand/logo-lucida.svg",
    exam:              "/brand/logo-lucida-exam.svg",
    analytics:         "/brand/logo-lucida-analytics.svg",
    symbol:            "/brand/symbol.svg",
    "symbol-analytics": "/brand/symbol-analytics.svg",
  }[variant];

  const { w, h } = {
    full:              { w: 160, h: 40 },
    exam:              { w: 180, h: 40 },
    analytics:         { w: 200, h: 40 },
    symbol:            { w: 40, h: 40 },
    "symbol-analytics": { w: 40, h: 40 },
  }[variant];

  return (
    <Image
      src={src}
      alt="Lucida"
      width={w}
      height={h}
      priority
      className={cn("select-none", className)}
    />
  );
}
```

Regra: dentro de um layout `theme-analytics`, use `variant="analytics"` ou
`variant="symbol-analytics"`. Nunca misture logo azul Exam com tela Analytics —
é um dos red flags mais grosseiros de violação de marca.

**Regras do manual** (não burlar):
- Reduções mínimas: `full` 160px / `exam` 180px / `symbol` 40px.
- Nunca adicionar efeitos (outline, sombra colorida, rotação).
- Área de proteção ao redor = largura da letra "c" do logo (~20% da altura). Não coloque texto ou imagem dentro dessa área.
- Posicionamento em layout: cantos ou centro — ver [quality-a11y-perf.md](quality-a11y-perf.md).
