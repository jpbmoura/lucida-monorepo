import { ImageResponse } from "next/og";

/**
 * Símbolo da marca (variante monocromática) recolorido em branco e com fundo
 * transparente. O `fill` no `<svg>` raiz cascateia pros paths/ellipses, que
 * não declaram fill próprio. Aspecto nativo: 507.37 × 536.09.
 */
const SYMBOL_ASPECT = 507.37 / 536.09;
const SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.37 536.09" fill="#ffffff"><ellipse cx="61.78" cy="268.19" rx="25.91" ry="156.44"/><ellipse cx="11.96" cy="268.19" rx="11.96" ry="90.68"/><path d="M460.36,101.64c-11.27,0-21.61,14.07-29.71,37.5-1.19,3.45-6.16,3.12-6.86-.47-11.63-59.68-31.08-98.81-53.11-98.81-16.87,0-32.22,22.93-43.71,60.47-1.07,3.5-6.07,3.33-6.88-.24C306.21,39.06,284.93,0,261.07,0c-20.78,0-39.6,29.62-53.29,77.58-.92,3.23-5.39,3.46-6.7.37-10.22-24.07-22.48-38.1-35.67-38.1-35.61,0-64.47,102.16-64.47,228.19s28.86,228.19,64.47,228.19c13.19,0,25.46-14.03,35.67-38.1,1.31-3.09,5.78-2.86,6.7.37,13.68,47.96,32.51,77.58,53.29,77.58,23.86,0,45.14-39.06,59.02-100.09.81-3.57,5.81-3.74,6.88-.24,11.49,37.54,26.84,60.47,43.71,60.47,22.03,0,41.48-39.12,53.11-98.81.7-3.59,5.67-3.92,6.86-.47,8.1,23.43,18.44,37.49,29.71,37.49,25.97,0,47.01-74.5,47.01-166.41s-21.05-166.41-47.01-166.41ZM297.23,269.89c-17.22,0-31.18-22.22-31.18-49.64s13.96-49.64,31.18-49.64,31.18,22.22,31.18,49.64-13.96,49.64-31.18,49.64ZM390.77,269.89c-17.22,0-31.18-22.22-31.18-49.64s13.96-49.64,31.18-49.64,31.18,22.22,31.18,49.64-13.96,49.64-31.18,49.64Z"/></svg>`;

const SYMBOL_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(SYMBOL_SVG).toString("base64")}`;

/** Azul da marca Lucida (skill brand-lucida). */
const BRAND_BLUE = "#007AFF";

interface IconOptions {
  /** Square (sem cantos arredondados) — usado em maskable e apple-touch.
   *  Launchers Android e o iOS aplicam a própria máscara/rounding. */
  square?: boolean;
  /** Fração de respiro em cada lado (0–0.5). Maskable precisa de ~20%. */
  pad?: number;
}

/**
 * Gera um PNG do ícone da marca (símbolo branco sobre azul) no tamanho pedido,
 * via next/og. Usado pelas rotas /icon-*.png e /apple-icon.png referenciadas no
 * manifest e no metadata. Sem texto → não precisa carregar fontes.
 */
export function renderPwaIcon(size: number, opts: IconOptions = {}) {
  const pad = opts.pad ?? 0.14;
  const innerHeight = Math.round(size * (1 - pad * 2));
  const innerWidth = Math.round(innerHeight * SYMBOL_ASPECT);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_BLUE,
          borderRadius: opts.square ? 0 : Math.round(size * 0.22),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SYMBOL_DATA_URI} width={innerWidth} height={innerHeight} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
