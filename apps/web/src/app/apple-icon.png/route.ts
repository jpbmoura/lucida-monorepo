import { renderPwaIcon } from "@/lib/pwa-icon";

export const dynamic = "force-static";

// apple-touch-icon (180×180). Square: o iOS arredonda sozinho — cantos próprios
// causariam double-rounding.
export function GET() {
  return renderPwaIcon(180, { square: true, pad: 0.16 });
}
