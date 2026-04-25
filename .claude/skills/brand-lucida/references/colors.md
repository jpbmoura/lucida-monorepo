# Paletas de Cores — Lucida

## Lucida e Lucida Exam (tom azul)

Produto principal — professor individual, criação e correção de provas.

| Nome           | HEX       | CMYK            | Pantone |
| -------------- | --------- | --------------- | ------- |
| Azul Principal | `#007AFF` | 72 / 47 / 0 / 0 | 285 C   |
| Azul Escuro 01 | `#1D14FF` | 84 / 75 / 0 / 0 | 2728 C  |
| Azul Escuro 02 | `#150BBC` | 91 / 86 / 0 / 0 | 2738 C  |
| Azul Claro     | `#7FBDF4` | 38 / 13 / 0 / 0 | 2905 C  |

**Uso em CSS/Tailwind:**

```css
/* Tokens recomendados */
--lucida-blue-primary: #007aff;
--lucida-blue-dark1: #1d14ff;
--lucida-blue-dark2: #150bbc;
--lucida-blue-light: #7fbdf4;
```

---

## Lucida Analytics (tom roxo)

Dashboard de organizações / instituições — gestão de ensino (coordenação,
diretoria, redes de escolas). É um ambiente paralelo ao Exam, com paleta própria
pra sinalizar visualmente ao usuário que ele está no contexto de gestão.

| Nome           | HEX       | CMYK            | Pantone |
| -------------- | --------- | --------------- | ------- |
| Roxo Principal | `#6C3CFB` | 69 / 72 / 0 / 0 | 2665 C  |
| Roxo Escuro 01 | `#4D30CE` | 77 / 78 / 0 / 0 | 2725 C  |
| Roxo Escuro 02 | `#1E0A96` | 96 / 99 / 0 / 0 | 2736 C  |
| Roxo Claro     | `#927AFC` | 47 / 49 / 0 / 0 | 2645 C  |

**Uso em CSS/Tailwind:**

```css
/* Tokens recomendados */
--lucida-purple-primary: #6c3cfb;
--lucida-purple-dark1: #4d30ce;
--lucida-purple-dark2: #1e0a96;
--lucida-purple-light: #927afc;
```

**Contraste (WCAG):**

- `#6C3CFB` em branco: ~4.98:1 — passa AA para texto normal (≥14pt regular).
- Para corpo pequeno ou metadados, preferir `--lucida-purple-dark1` (`#4D30CE`, ~7.3:1 — AAA).
- Em fundo `#051E2C` (super-dark), usar `#927AFC` (roxo claro) pra links/accents.

---

## Cores Secundárias (todas as marcas)

Usadas como apoio e contraste em todos os produtos:

| Nome              | HEX       | CMYK              | Pantone |
| ----------------- | --------- | ----------------- | ------- |
| Azul Super Escuro | `#051E2C` | 93 / 76 / 53 / 62 | 2965 C  |
| Off White         | `#F9F5EA` | 1 / 2 / 6 / 0     | 7527 C  |
| Preto             | `#000000` | —                 | —       |
| Branco            | `#FFFFFF` | —                 | —       |

**Quando usar secundárias:**

- `#051E2C` (Azul Super Escuro): fundos escuros, contraste forte — é o "navy" da marca
- `#F9F5EA` (Off White): fundos claros alternativos ao branco puro
- Preto/Branco: logotipos monocromáticos, textos, ícones

---

## Regras de combinação

- Fundo escuro (`#051E2C`) → texto branco + cor principal do produto
- Fundo branco/off-white → cor principal do produto + texto preto
- **Nunca** misturar paletas de produtos diferentes no mesmo layout (ex: botão
  roxo Analytics numa tela Exam, ou vice-versa)
- Ao cruzar entre produtos (ex: um link do Exam que leva pro Analytics), a transição
  acontece via navegação — a tela de destino carrega no tom do produto de destino,
  não no produto de origem
- Se a cor não oferecer contraste suficiente, usar versão preto ou branco do logotipo
