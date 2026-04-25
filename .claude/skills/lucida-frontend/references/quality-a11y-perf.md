# Qualidade: Acessibilidade + Performance

Dois eixos que definem se o frontend é profissional ou não. shadcn cobre boa parte da base — mas o resto é responsabilidade do componente.

## Acessibilidade — o básico não-negociável

### HTML semântico antes de ARIA

| Intenção | Tag | Não use |
|---|---|---|
| Ação | `<button>` | `<div onClick>` |
| Navegação | `<a href>` | `<span onClick={router.push}>` |
| Seção com título | `<section>` com `<h2>` | `<div className="section">` |
| Lista | `<ul>` / `<ol>` | `<div>` repetido |
| Form | `<form>` com `<label>` e `<input>` | divs com contentEditable |
| Progresso | `<progress>` | div com `width: x%` |

Regra: **ARIA só quando HTML semântico não basta**. Combobox custom? aí sim `role="combobox"` + `aria-*`. Mas 80% dos casos são HTML puro.

### Labels e descrições

Todo input **tem que** ter label associado:

```tsx
// ✅
<label htmlFor="title">Título</label>
<input id="title" name="title" />

// ✅ (shadcn faz isso automaticamente via FormField)
<FormField name="title" render={({ field }) => (
  <FormItem>
    <FormLabel>Título</FormLabel>
    <FormControl><Input {...field} /></FormControl>
    <FormMessage />
  </FormItem>
)} />

// ❌
<p>Título</p>
<input />
```

Para ícone sem texto (ex: botão lupa):

```tsx
<Button size="icon" aria-label="Buscar">
  <Search className="h-4 w-4" />
</Button>
```

### Focus visível

shadcn já aplica `focus-visible:ring-2 focus-visible:ring-brand-primary` nos primitives. **Não remova**. Se customizar, mantenha um indicador visível:

```tsx
className={cn(
  "...",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
)}
```

Teste com Tab no browser. Se algum elemento interativo some ou não mostra foco, é bug.

### Navegação por teclado

- Tab: avança pelos elementos focáveis.
- Shift+Tab: volta.
- Enter/Space: ativa botão.
- Escape: fecha dialog/dropdown.
- Setas: navega dentro de menu/select (shadcn Radix cuida).

Se você está construindo componente custom (sem Radix), **tem que** implementar. Prefira usar Radix/shadcn.

### Contraste WCAG

Regra mínima: **AA**.
- Texto normal: 4.5:1.
- Texto grande (≥18pt / 14pt bold): 3:1.
- Elementos gráficos / ícones: 3:1.

Contrastes da marca Lucida em branco (`#FFFFFF`):

| Cor | Ratio | Uso aprovado |
|---|---|---|
| `#007AFF` (brand-primary) | **3.04:1** | ✅ texto grande, ❌ texto pequeno |
| `#1D14FF` (brand-dark-01) | **8.2:1** | ✅ texto normal e grande (AAA) |
| `#150BBC` (brand-dark-02) | **11.3:1** | ✅ AAA |
| `#051E2C` (brand-super-dark) | **16.5:1** | ✅ AAA |
| `#7FBDF4` (brand-light) | 2.1:1 | ❌ nunca para texto. Use como bg ou accent. |

**Regra prática**: para CTA pequeno/texto pequeno com cor da marca, sempre `text-brand-dark-01`. Para headings grandes, `text-brand-primary` pode ser ok (confirme com ferramenta).

Em fundo `--color-brand-super-dark` (#051E2C):
- `text-brand-off-white` (#F9F5EA): 15.8:1 — AAA.
- `text-brand-light` (#7FBDF4): 7.5:1 — AAA.
- `text-brand-primary` (#007AFF): 5.4:1 — AA.

Ferramenta: <https://webaim.org/resources/contrastchecker/>.

### Role="alert" para feedback de erro

```tsx
{error && (
  <p role="alert" className="text-sm text-destructive">
    {error.message}
  </p>
)}
```

Screen reader anuncia imediatamente.

### Reduced motion

Respeite `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Adicione uma vez no `globals.css`.

### Idioma da página

```tsx
<html lang="pt-BR">
```

Obrigatório. Screen readers escolhem pronúncia baseado nisso.

## Performance

### `next/font` (obrigatório)

Já coberto em [typography.md](typography.md). Nunca `@import` do Google Fonts.

### `next/image` (obrigatório para imagens)

```tsx
import Image from "next/image";

<Image
  src="/brand/logo-lucida.svg"
  alt="Lucida"
  width={160}
  height={40}
  priority             // só no LCP candidato (logo no header, hero image)
/>

// Imagens remotas:
<Image
  src="https://cdn.../foto.jpg"
  alt="..."
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Regras**:
- `width` e `height` **sempre** — evita CLS.
- `priority` só para a imagem LCP (1 por página).
- Remote images: configure `next.config.js` → `images: { remotePatterns: [...] }`.
- Use `sizes` para responsive; permite gerar srcset otimizado.

### Lazy loading de client components pesados

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./heavy-chart").then(m => m.HeavyChart), {
  loading: () => <ChartSkeleton />,
  ssr: false,    // se só faz sentido no client (biblioteca browser-only)
});
```

Bom para:
- Charts (recharts, visx).
- Rich text editors (TipTap, Lexical).
- PDF viewers.
- Qualquer componente >100kb.

Avalie antes: se é usado em 80% das páginas, code-split não ajuda.

### Server Components para reduzir JS

Cada `"use client"` que você **não** escreve é JS que **não** vai para o client. Em páginas muito estáticas (landing, docs), o bundle client pode ficar <10kb. Isso é o ganho real do App Router.

### Streaming com Suspense

Ver [data-fetching.md](data-fetching.md). Resumo: partes lentas da página podem carregar depois sem bloquear o resto.

### Métricas a monitorar

- **LCP** (Largest Contentful Paint): <2.5s. Geralmente hero image/heading.
- **CLS** (Cumulative Layout Shift): <0.1. Fontes + imagens sem dimensões são os culpados típicos.
- **INP** (Interaction to Next Paint): <200ms. Handlers pesados no main thread.
- **Bundle size**: olhe `next build` — páginas >200kb First Load JS são alerta.

Ferramentas:
- Chrome DevTools Lighthouse.
- `@next/bundle-analyzer` para mapa do bundle.
- Vercel Analytics / Sentry Performance em prod.

### Evitar waterfalls de fetch

```tsx
// ❌ sequential — total = a + b + c
const a = await getA();
const b = await getB();
const c = await getC();

// ✅ parallel
const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
```

Vale em server component e em server action. Fetches independentes **nunca** em série.

### Cache de fetch

No Next, `fetch()` em server component é cacheado por default:

```ts
// Cache full (static)
fetch(url);

// Revalida a cada 60s
fetch(url, { next: { revalidate: 60 } });

// Nunca cacheia (dinâmico)
fetch(url, { cache: "no-store" });

// Invalida por tag
fetch(url, { next: { tags: ["exams"] } });
// Em outra função:
import { revalidateTag } from "next/cache";
revalidateTag("exams");
```

Default **cacheado estático** mudou no Next 15 — vale re-checar versão do projeto.

## Posicionamento do logo (regra do manual)

Em qualquer layout, logo só pode ficar em 5 posições:
1. Canto superior esquerdo (padrão em header).
2. Canto superior direito.
3. Centro.
4. Canto inferior esquerdo.
5. Canto inferior direito (padrão em footer).

**Área de proteção** = largura da letra "c" do logo (~20% da altura). Use padding:

```tsx
<header className="p-6">    {/* padding >= área de proteção */}
  <Logo variant="full" />
</header>
```

**Nunca**:
- Rotacionar.
- Aplicar outline, sombra colorida, ou filtros.
- Redimensionar abaixo do mínimo (160px full / 40px symbol).
- Recolorir fora das cores permitidas (azul da marca, preto, branco).

## Checklist de revisão de qualidade

Antes de merge, verifique:

- [ ] Todos os inputs têm label associado.
- [ ] Focus visível em todos elementos interativos.
- [ ] Tab order é lógico (sem skipping esquisito).
- [ ] Contraste WCAG AA (mínimo) checado para textos na cor da marca.
- [ ] Imagens com alt (`alt=""` explícito se decorativa).
- [ ] `next/image` para imagens, `next/font` para fontes.
- [ ] LCP image tem `priority`.
- [ ] Sem `any` em tipos públicos.
- [ ] Sem `console.log` deixado.
- [ ] Dark section usa `--color-brand-super-dark` (não `bg-black`) + `--color-brand-off-white` (não `text-white`).
- [ ] Logo respeita tamanho mínimo e área de proteção.
- [ ] Skeleton/loading state em listas client-side.
- [ ] Mensagens em pt-BR.
