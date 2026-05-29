import { renderPwaIcon } from "@/lib/pwa-icon";

export const dynamic = "force-static";

// Maskable: fundo full-bleed (sem cantos) e respiro maior — o launcher recorta
// na forma da plataforma (círculo, squircle, etc).
export function GET() {
  return renderPwaIcon(512, { square: true, pad: 0.2 });
}
